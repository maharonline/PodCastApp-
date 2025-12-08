import { StyleSheet, View } from 'react-native';

const StripeBackground = () => {
  const stripes = Array.from({ length: 80 }); // Increased count for full coverage

  return (
    <View style={styles.stripeContainer}>
      {stripes.map((_, i) => (
        <View
          key={i}
          style={[
            styles.stripe,
            { transform: [{ rotate: '-45deg' }], left: i * 20 - 300 }, // Start further left and cover more width
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  stripeContainer: {
    ...StyleSheet.absoluteFillObject, // ✓ Correct fix
    flexDirection: 'row',
    overflow: 'hidden',
  },

  stripe: {
    width: 8,
    height: '300%', // Increased height for better coverage
    // backgroundColor: "#1F1F1F",
    backgroundColor: 'rgba(255,255,255,0.08)',
    position: 'absolute',
    top: -100, // Start higher to cover top area
  },
});

export default StripeBackground;
