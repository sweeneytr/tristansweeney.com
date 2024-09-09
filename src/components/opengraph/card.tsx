import React from "react";

export const OpenGraphCard = () => {
  const link = "https://tristansweeney.com";
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          backgroundColor: "#c084fc",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "3rem",
          width: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            backgroundColor: "white",
            border: "6px solid black",
            borderRadius: "0.5rem",
            padding: "2rem",
            filter: "drop-shadow(6px 6px 0 rgb(0 0 0 / 1))",
            boxShadow: "8px 8px 0 black",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column" }}>
              <p
                style={{
                  fontSize: "58px",
                  margin: 0,
                  fontFamily: "righteous, sans-serif",
                }}
              >
                Tristan Sweeney
              </p>
              <p
                style={{
                  fontSize: "38px",
                  margin: 0,
                  marginBottom: "0.75rem",
                  fontFamily: "poppins, sans-serif",
                }}
              >
                Software engineer for humans
              </p>
              <p
                style={{ fontSize: "38px", fontFamily: "poppins, sans-serif" }}
              >
                Bringing together developers, by bringing together technology
              </p>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                paddingTop: "-2rem",
              }}
            >
              <p
                style={{ fontSize: "32px", fontFamily: "sanchez, sans-serif" }}
              >
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
    </div>
  );
};
