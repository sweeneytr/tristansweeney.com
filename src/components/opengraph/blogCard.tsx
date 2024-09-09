export const BlogCard = ({ title, description }: Record<string, string>) => (
  <div
    style={{
      backgroundColor: "white",
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
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
          >
            <p style={{ fontSize: "48px" }}>Brutal theme for Astro</p>
            <p style={{ fontSize: "38px" }}>{title}</p>
          </div>
          <img
            src="https://media.licdn.com/dms/image/v2/D4E03AQEaDQ0_v3CrDA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1681700280055?e=1730937600&v=beta&t=NGnuiydWpJLNhqQNs_n-EHzhU0lGqr7srokC6Bcapw4"
            alt="Profile"
            width="200"
            height="200"
            style={{ border: "3px solid black", borderRadius: "0.5rem" }}
          />
        </div>
        <div style={{ display: "flex" }}>
          <p style={{ fontSize: "24px" }}>{description}</p>
        </div>
      </div>
    </div>
  </div>
);
