import { useMemo, useState } from "react";
import { cx, sortCx } from "@/utils/cx";
import { MastercardIcon, MastercardIconWhite, PaypassIcon } from "./icons";

const MastercardIconComponent = () => (
  <div className="flex items-center">
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#EB001B",
        opacity: 0.95,
        marginRight: -12,
        zIndex: 1,
      }}
    />
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: "#F79E1B",
        opacity: 0.95,
        zIndex: 0,
      }}
    />
  </div>
);

const styles = sortCx({
    // Normal
    transparent: {
        root: "bg-black/10 bg-linear-to-br from-white/30 to-transparent backdrop-blur-[6px] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "transparent-gradient": {
        root: "bg-black/10 bg-linear-to-br from-white/30 to-transparent backdrop-blur-[6px] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "brand-dark": {
        root: "bg-linear-to-tr from-brand-900 to-brand-700 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "brand-light": {
        root: "bg-brand-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-black/10 before:ring-inset",
        company: "text-gray-700",
        footerText: "text-gray-700",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white",
    },
    "gray-dark": {
        root: "bg-linear-to-tr from-gray-900 to-gray-700 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-white/30 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
    "gray-light": {
        root: "bg-gray-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:mask-linear-135 before:mask-linear-to-white/20 before:ring-1 before:ring-black/10 before:ring-inset",
        company: "text-gray-700",
        footerText: "text-gray-700",
        paypassIcon: "text-gray-400",
        cardTypeRoot: "bg-white",
    },
    "orange": {
        root: "bg-[#F97316] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-white/20 before:ring-inset",
        company: "text-white",
        footerText: "text-white",
        paypassIcon: "text-white",
        cardTypeRoot: "bg-white/10",
    },
});

const _NORMAL_TYPES = ["transparent", "transparent-gradient", "brand-dark", "brand-light", "gray-dark", "gray-light", "orange"] as const;
const STRIP_TYPES = ["transparent-strip", "gray-strip", "gradient-strip", "salmon-strip"] as const;
const VERTICAL_STRIP_TYPES = ["gray-strip-vertical", "gradient-strip-vertical", "salmon-strip-vertical"] as const;

const CARD_WITH_COLOR_LOGO = ["brand-dark", "brand-light", "gray-dark", "gray-light", "orange"] as const;

type CreditCardType = (typeof _NORMAL_TYPES)[number] | (typeof STRIP_TYPES)[number] | (typeof VERTICAL_STRIP_TYPES)[number];

interface CreditCardProps {
    company?: string;
    cardNumber?: string;
    cardHolder?: string;
    cardExpiration?: string;
    type?: CreditCardType;
    className?: string;
    width?: number;
    currentBalance?: string;
}

const calculateScale = (desiredWidth: number, originalWidth: number, originalHeight: number) => {
    const scale = desiredWidth / originalWidth;
    const scaledWidth = originalWidth * scale;
    const scaledHeight = originalHeight * scale;

    return {
        scale: scale.toFixed(4),
        scaledWidth: scaledWidth.toFixed(2),
        scaledHeight: scaledHeight.toFixed(2),
    };
};

export const CreditCard = ({
    company = "Untitled.",
    cardNumber = "1234 1234 1234 1234",
    cardHolder = "OLIVIA RHYE",
    cardExpiration = "06/28",
    type = "brand-dark",
    className,
    width,
    currentBalance,
}: CreditCardProps) => {
    const [flipped, setFlipped] = useState(false);
    const originalWidth = 340;
    const originalHeight = 210;

    const { scale, scaledWidth, scaledHeight } = useMemo(() => {
        if (!width)
            return {
                scale: 1,
                scaledWidth: originalWidth,
                scaledHeight: originalHeight,
            };

        return calculateScale(width, originalWidth, originalHeight);
    }, [width]);

    // Use orange gradient for orange type, otherwise use the style system
    const isOrangeType = type === "orange";
    const orangeGradient = "linear-gradient(135deg, #F97316 0%, #EA580C 40%, #FB923C 80%, #FDBA74 100%)";
    const orangeGradientBack = "linear-gradient(135deg, #EA580C 0%, #F97316 60%, #FDBA74 100%)";

    return (
        <div
            style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
            className={cx("relative", className)}
        >
            {/* Card wrapper with 3D perspective */}
            <div
                onClick={() => setFlipped(!flipped)}
                style={{
                    perspective: "1000px",
                    cursor: "pointer",
                    userSelect: "none",
                    width: `${scaledWidth}px`,
                    height: `${scaledHeight}px`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <div
                    style={{
                        width: `${originalWidth}px`,
                        height: `${originalHeight}px`,
                        position: "relative",
                        transformStyle: "preserve-3d",
                        transition: "transform 0.7s cubic-bezier(0.4, 0.2, 0.2, 1)",
                        transform: `scale(${scale}) ${flipped ? "rotateY(180deg)" : "rotateY(0deg)"}`,
                        transformOrigin: "center center",
                    }}
                >
                    {/* FRONT */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            borderRadius: 20,
                            background: isOrangeType ? orangeGradient : undefined,
                            boxShadow: isOrangeType 
                                ? "0 8px 25px rgba(0,0,0,0.4)"
                                : undefined,
                            padding: "26px 28px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            overflow: "hidden",
                            ...(isOrangeType ? {} : { className: cx(styles[type].root) }),
                        }}
                        className={!isOrangeType ? cx(styles[type].root) : undefined}
                    >
                        
                        {/* Decorative circles */}
                        <div
                            style={{
                                position: "absolute",
                                width: 220,
                                height: 220,
                                borderRadius: "50%",
                                border: "1.5px solid rgba(255,255,255,0.08)",
                                top: -70,
                                right: -60,
                            }}
                        />
                        <div
                            style={{
                                position: "absolute",
                                width: 160,
                                height: 160,
                                borderRadius: "50%",
                                border: "1.5px solid rgba(255,255,255,0.06)",
                                bottom: -50,
                                left: -40,
                            }}
                        />

                        {/* Top row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative", zIndex: 2 }}>
                            <div>
                                {currentBalance ? (
                                    <>
                                        <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
                                            Current Balance
                                        </p>
                                        <p style={{ color: "#fff", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", margin: "4px 0 0", lineHeight: 1 }}>
                                            {currentBalance}
                                        </p>
                                    </>
                                ) : (
                                    <div className={cx("text-md leading-[normal] font-semibold", styles[type].company)}>{company}</div>
                                )}
                            </div>
                            <MastercardIconComponent />
                        </div>

                        {/* Bottom row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "relative", zIndex: 2 }}>
                            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13.5, fontWeight: 400, letterSpacing: "0.18em", margin: 0, fontFamily: "monospace" }}>
                                {cardNumber}
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 500, letterSpacing: "0.05em", margin: 0 }}>
                                {cardExpiration}
                            </p>
                        </div>
                    </div>

                    {/* BACK */}
                    <div
                        style={{
                            position: "absolute",
                            inset: 0,
                            backfaceVisibility: "hidden",
                            WebkitBackfaceVisibility: "hidden",
                            borderRadius: 20,
                            background: isOrangeType ? orangeGradientBack : undefined,
                            boxShadow: isOrangeType 
                                ? "0 8px 25px rgba(0,0,0,0.4)"
                                : undefined,
                            transform: "rotateY(180deg)",
                            overflow: "hidden",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            ...(isOrangeType ? {} : { className: cx(styles[type].root) }),
                        }}
                        className={!isOrangeType ? cx(styles[type].root) : undefined}
                    >
                        {/* Magnetic stripe */}
                        <div style={{ width: "100%", height: 42, background: "#111", margin: "0 0 20px" }} />
                        {/* CVV strip */}
                        <div style={{ padding: "0 28px" }}>
                            <div style={{ background: "rgba(255,255,255,0.9)", borderRadius: 4, padding: "6px 12px", display: "flex", justifyContent: "flex-end" }}>
                                <span style={{ color: "#1d1d1d", fontSize: 14, fontWeight: 600, letterSpacing: "0.1em", fontFamily: "monospace" }}>
                                    • • •
                                </span>
                            </div>
                            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 6, textAlign: "right" }}>CVV</p>
                        </div>
                        <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 28px 0" }}>
                            <MastercardIconComponent />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
