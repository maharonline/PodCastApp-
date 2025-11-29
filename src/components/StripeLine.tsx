import { StyleSheet, View } from "react-native";

const StripeBackground = () => {
    const stripes = Array.from({ length: 40 });

    return (
        <View style={styles.stripeContainer}>
            {stripes.map((_, i) => (
                <View
                    key={i}
                    style={[
                        styles.stripe,
                        { transform: [{ rotate: "-10deg" }], left: i * 12 },
                    ]}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    stripeContainer: {
        ...StyleSheet.absoluteFillObject,   // ✓ Correct fix
        flexDirection: "row",
        overflow: "hidden",
    },

    stripe: {
        width: 8,
        height: "200%",
        backgroundColor: "rgba(255,255,255,0.08)",
        position: "absolute",
    },
});

export default StripeBackground;
