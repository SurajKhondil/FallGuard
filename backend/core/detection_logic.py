import math
import numpy as np

class PersonPresenceDetector:
    def __init__(self, visibility_threshold=0.5, no_person_duration=2.0):
        self.visibility_threshold = visibility_threshold
        self.no_person_duration = no_person_duration
        self.no_person_start_time = None
        self.has_detected_once = False

    def check_presence(self, landmarks, timestamp):
        """
        Part 1: Person Detection
        Requires: Both shoulders visible AND at least one of (hip or nose) visible.
        """
        if not landmarks:
            return self._handle_no_person(timestamp)

        def is_visible(idx):
            if idx in landmarks:
                return landmarks[idx].get('visibility', 1.0) > self.visibility_threshold
            return False

        nose_ok = is_visible(0)
        shoulders_ok = is_visible(11) and is_visible(12)
        hips_ok = is_visible(23) or is_visible(24)

        if nose_ok and shoulders_ok and hips_ok:
            self.no_person_start_time = None
            self.has_detected_once = True
            return True
        else:
            return self._handle_no_person(timestamp)

    def _handle_no_person(self, timestamp):
        if not self.has_detected_once:
            return False
        if self.no_person_start_time is None:
            self.no_person_start_time = timestamp
            return True
        elapsed = timestamp - self.no_person_start_time
        if elapsed >= self.no_person_duration:
            return False
        return True


class FallDetector:
    def __init__(self, angle_threshold=60, velocity_threshold=0.5, inactivity_duration=5.0):
        self.angle_threshold = angle_threshold
        self.velocity_threshold = velocity_threshold
        self.inactivity_duration = inactivity_duration

        self.previous_mid_hip = None
        self.previous_mid_shoulder = None
        self.previous_timestamp = None

        self.fall_detected_time = None
        self.is_confirmed_fall = False
        self.last_direction = None
        # NOTE: Must be negative so had_recent_drop = False at video/session start.
        # If initialized to 0, first 2 seconds of every video has had_recent_drop=True,
        # which causes false falls if person is bent over or partially in frame.
        self.last_high_velocity_time = -10.0

    def calculate_spine_angle(self, mid_shoulder, mid_hip):
        dx = mid_shoulder['x'] - mid_hip['x']
        dy = mid_shoulder['y'] - mid_hip['y']
        angle_rad = math.atan2(abs(dx), abs(dy))
        return math.degrees(angle_rad)

    def get_aspect_ratio(self, landmarks):
        try:
            x_coords = [lm['x'] for lm in landmarks.values()]
            y_coords = [lm['y'] for lm in landmarks.values()]
            width = max(x_coords) - min(x_coords)
            height = max(y_coords) - min(y_coords)
            if height == 0:
                return 0
            return width / height
        except (ValueError, AttributeError):
            return 0

    def calculate_confidence(self, landmarks):
        vis_scores = []
        for idx in [11, 12, 23, 24]:
            if idx in landmarks:
                vis_scores.append(landmarks[idx].get('visibility', 1.0))
        if not vis_scores:
            return 0.0
        return sum(vis_scores) / len(vis_scores)

    def determine_direction(self, dx, dy, dz):
        if abs(dx) > abs(dy) and abs(dx) > abs(dz):
            return "RIGHT" if dx > 0 else "LEFT"
        else:
            return "FORWARD" if dz < 0 else "BACKWARD"

    def check_fall(self, landmarks, timestamp):
        """
        Returns: (event_type, direction, angle, velocity, aspect_ratio)
        event_type: 'NORMAL' | 'FALL_DETECTED' | 'CONFIRMED_FALL'
        """
        try:
            ls, rs = landmarks[11], landmarks[12]
            lh, rh = landmarks[23], landmarks[24]

            mid_shoulder = {
                "x": (ls['x'] + rs['x']) / 2,
                "y": (ls['y'] + rs['y']) / 2,
                "z": (ls['z'] + rs['z']) / 2
            }
            mid_hip = {
                "x": (lh['x'] + rh['x']) / 2,
                "y": (lh['y'] + rh['y']) / 2,
                "z": (lh['z'] + rh['z']) / 2
            }
        except KeyError:
            return "NORMAL", None, 0, 0, 0

        angle = self.calculate_spine_angle(mid_shoulder, mid_hip)
        aspect_ratio = self.get_aspect_ratio(landmarks)
        confidence = self.calculate_confidence(landmarks)

        velocity = 0
        dx, dy, dz = 0, 0, 0

        if self.previous_mid_hip is not None and self.previous_timestamp is not None:
            dt = timestamp - self.previous_timestamp
            if dt > 0:
                dx = mid_hip['x'] - self.previous_mid_hip['x']
                dy = mid_hip['y'] - self.previous_mid_hip['y']
                dz = mid_hip['z'] - self.previous_mid_hip['z']
                velocity = dy / dt

        if velocity > 0.1:
            self.last_high_velocity_time = timestamp

        had_recent_drop = (timestamp - self.last_high_velocity_time) < 2.0

        is_falling_now = (
            angle > 60 and
            had_recent_drop and
            aspect_ratio > 0.8 and
            confidence > 0.7
        )

        self.previous_mid_hip = mid_hip
        self.previous_mid_shoulder = mid_shoulder
        self.previous_timestamp = timestamp

        event_type = "NORMAL"

        if is_falling_now:
            if self.fall_detected_time is None:
                self.fall_detected_time = timestamp
                self.last_direction = self.determine_direction(dx, dy, dz)
                self.is_confirmed_fall = False
                event_type = "FALL_DETECTED"
            else:
                event_type = "FALL_DETECTED"

        elif self.fall_detected_time is not None:
            elapsed = timestamp - self.fall_detected_time
            if not self.is_confirmed_fall:
                if elapsed >= self.inactivity_duration:
                    if abs(velocity) < 0.1 and angle > 45:
                        self.is_confirmed_fall = True
                        event_type = "CONFIRMED_FALL"
                    else:
                        self.fall_detected_time = None
                        self.last_direction = None
                        event_type = "NORMAL"
                else:
                    event_type = "FALL_DETECTED"
            else:
                if angle < 45:
                    self.fall_detected_time = None
                    self.is_confirmed_fall = False
                    self.last_direction = None
                    event_type = "NORMAL"
                else:
                    event_type = "CONFIRMED_FALL"

        return event_type, self.last_direction, angle, velocity, aspect_ratio
