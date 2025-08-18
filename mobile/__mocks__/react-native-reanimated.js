const Reanimated = {
  default: {
    createAnimatedComponent: (component) => component,
    View: require('react-native').View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
  },
  useSharedValue: (initialValue) => ({
    value: initialValue,
  }),
  useAnimatedStyle: (fn) => fn(),
  withTiming: (value) => value,
  withSpring: (value) => value,
  withSequence: (...values) => values[values.length - 1],
  withDelay: (delay, value) => value,
  interpolate: (value, input, output) => value,
  Easing: {
    linear: () => {},
    ease: () => {},
    quad: () => {},
    cubic: () => {},
    bezier: () => {},
  },
};

module.exports = Reanimated;