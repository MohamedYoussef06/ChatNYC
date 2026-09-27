import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Text, View } from 'react-native';
import { C } from '@/constants/theme';

export function OckThinking() {
  const dots = [useRef(new Animated.Value(.3)).current, useRef(new Animated.Value(.3)).current, useRef(new Animated.Value(.3)).current];
  useEffect(() => {
    let animation: Animated.CompositeAnimation | undefined;
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || !active) return;
      const pulse = (value: Animated.Value) => Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 260, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(value, { toValue: .3, duration: 260, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]);
      animation = Animated.loop(Animated.stagger(140, dots.map(pulse)));
      animation.start();
    });
    return () => { active = false; animation?.stop(); };
  }, []);
  return <View accessibilityRole="progressbar" accessibilityLabel="Ock is thinking" style={{ maxWidth: '88%', alignSelf: 'flex-start', paddingVertical: 13, paddingHorizontal: 16, borderRadius: 17, borderBottomLeftRadius: 5, backgroundColor: 'white', borderColor: C.line, borderWidth: 1, flexDirection: 'row', gap: 6 }}>{dots.map((opacity, index) => <Animated.View key={index} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.blue, opacity }} />)}<Text style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>Ock is thinking</Text></View>;
}
