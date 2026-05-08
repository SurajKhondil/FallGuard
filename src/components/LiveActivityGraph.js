import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { COLORS } from '../utils/theme';

const BARS = 16;

export default function LiveActivityGraph({ isActive }) {
  const animatedValues = useRef(
    Array.from({ length: BARS }).map(() => new Animated.Value(10))
  ).current;

  useEffect(() => {
    let animations = [];
    
    if (isActive) {
      // Create random loop animation for each bar
      animations = animatedValues.map((anim, index) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 20 + Math.random() * 40,
              duration: 300 + Math.random() * 400,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 10 + Math.random() * 10,
              duration: 300 + Math.random() * 400,
              useNativeDriver: false,
            }),
          ])
        );
      });
      animations.forEach(anim => anim.start());
    } else {
      // Reset to flat line if not active
      animatedValues.forEach(anim => {
        Animated.spring(anim, {
          toValue: 5,
          useNativeDriver: false,
        }).start();
      });
    }

    return () => {
      animations.forEach(anim => anim.stop());
    };
  }, [isActive]);

  return (
    <View style={styles.container}>
      {animatedValues.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.bar,
            { height: anim, backgroundColor: isActive ? COLORS.primary : COLORS.border }
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 60,
    width: '100%',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
});
