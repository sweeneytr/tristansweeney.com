import React, { type CSSProperties, type ReactNode } from "react";

type Props = {
  title: ReactNode;
  subtitle: ReactNode;
  description: ReactNode;
  link: ReactNode;
};

const styles = {
  flexRow: {
    display: "flex",
    flexDirection: "row",
  },
  flexColumn: {
    display: "flex",
    flexDirection: "column",
  },
  bgPurple: {
    backgroundColor: "#c084fc",
  },
} satisfies Record<string, CSSProperties>;

const fontSize = { large: "58px", medium: "38px" };

namespace Text {
  export type Props = {
    font: "righteous" | "poppins" | "sanchez";
    size: keyof typeof fontSize;
    children: ReactNode;
  };
}

const Text = ({ font, size, children }: Text.Props) => {
  return (
    <p
      style={{
        fontSize: fontSize[size],
        margin: 0,
        fontFamily: font,
      }}
    >
      {children}
    </p>
  );
};

export const OpenGraphCard = ({
  title,
  subtitle,
  link,
  description,
}: Props) => {
  return (
    <div
      style={{
        ...styles.flexColumn,
        ...styles.bgPurple,
        height: "100%",
        width: "100%",
      }}
    >
      <div
        style={{
          ...styles.flexRow,
          flex: 1,
          padding: "2rem",
          margin: "3rem",
          backgroundColor: "white",
          border: "6px solid black",
          borderRadius: "0.5rem",
          boxShadow: "8px 8px 0 black",
        }}
      >
        <div
          style={{
            ...styles.flexColumn,
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <div style={styles.flexColumn}>
            <div style={styles.flexRow}>
              <img
                src="https://sweeneytr-github-io.vercel.app/favicon.ico"
                alt="Profile"
                width="100"
                height="100"
                style={{
                  border: "3px solid black",
                  borderRadius: "0.5rem",
                  boxShadow: "3px 3px 0 black",
                }}
              />
              <div style={styles.flexColumn}>
                <Text font="righteous" size="large">
                  {title}
                </Text>
                <div style={{ ...styles.flexColumn, marginBottom: "0.75rem" }}>
                  <Text font="poppins" size="medium">
                    {subtitle}
                  </Text>
                </div>
              </div>
            </div>
            <Text font="poppins" size="medium">
              {description}
            </Text>
          </div>
          <div
            style={{
              ...styles.flexRow,
              justifyContent: "space-between",
              alignItems: "baseline",
              paddingTop: "-2rem",
            }}
          >
            <p style={{ fontSize: "32px", fontFamily: "sanchez, sans-serif" }}>
              {link}
            </p>
            <img
              src="https://media.licdn.com/dms/image/v2/D4E03AQEaDQ0_v3CrDA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1681700280055?e=1730937600&v=beta&t=NGnuiydWpJLNhqQNs_n-EHzhU0lGqr7srokC6Bcapw4"
              alt="Profile"
              width="200"
              height="200"
              style={{
                border: "3px solid black",
                borderRadius: "0.5rem",
                boxShadow: "3px 3px 0 black",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
