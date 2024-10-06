import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  type TextProps,
} from "@react-pdf/renderer";
import { Email, Home, Phone } from "./icons";
import { content } from "./content";

type Props = { children: React.ReactNode };

const ResumePage = ({ children }: Props) => (
  <Page
    size="LETTER"
    style={{
      flexDirection: "column",
      backgroundColor: "white",
      padding: "1in",
      gap: "4",
    }}
  >
    {children}
  </Page>
);

const Header = ({ children }: Props) => (
  <View
    style={{
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: "5pt",
    }}
  >
    {children}
  </View>
);

const Row = ({
  children,
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View
    style={{
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: "8em",
      ...style,
    }}
    {...rest}
  >
    {children}
  </View>
);

const Section = ({ children }: Props) => (
  <View
    style={{
      flexDirection: "column",
      justifyContent: "center",
      gap: "2",
    }}
  >
    {children}
  </View>
);

Section.Header = ({ children }: Props) => (
  <Text
    style={{
      width: "100%",
      borderBottom: "2px",
      borderColor: "black",
      fontFamily: "Outfit",
      fontSize: "12",
    }}
  >
    {children}
  </Text>
);

const Seperator = ({ style, ...rest }: React.ComponentProps<typeof View>) => (
  <View
    style={{
      width: 0,
      height: "100%",
      borderRight: "1px",
      borderColor: "black",
      ...style,
    }}
    {...rest}
  />
);

const Company = ({
  children,
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={{ ...style }} {...rest}>
    {children}
  </View>
);

Company.Header = ({
  style,
  children,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "flex-end",
      justifyContent: "space-between",
      ...style,
    }}
    {...rest}
  >
    {children}
  </View>
);

Company.Name = ({ style, children, ...rest }: TextProps & Props) => (
  <Text
    style={{
      fontSize: "12",
      fontFamily: "Poppins",
      fontWeight: "bold",
      ...style,
    }}
    {...rest}
  >
    {children}
  </Text>
);

Company.Location = ({ children, style, ...rest }: TextProps & Props) => (
  <Text
    style={{
      fontSize: "10",
      fontFamily: "Poppins",
      fontStyle: "italic",
      fontWeight: "light",
      ...style,
    }}
    {...rest}
  >
    {children}
  </Text>
);

const Role = ({
  children,
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={{ marginBottom: "11px", ...style }} {...rest}>
    {children}
  </View>
);

Role.Header = ({
  style,
  children,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View
    style={{
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      ...style,
    }}
    {...rest}
  >
    {children}
  </View>
);

Role.Name = ({ children, style, ...rest }: TextProps & Props) => (
  <Text
    style={{
      fontSize: "10",
      textTransform: "uppercase",
      fontFamily: "Poppins",
      ...style,
    }}
    {...rest}
  >
    {children}
  </Text>
);

Role.Duration = ({ children, ...rest }: TextProps & Props) => (
  <Text
    style={{
      fontSize: "10",
      fontFamily: "Poppins",
      fontStyle: "italic",
      fontWeight: "light",
    }}
    {...rest}
  >
    {children}
  </Text>
);

const Point = ({ children, ...rest }: React.ComponentProps<typeof View>) => (
  <View
    style={{
      flexDirection: "row",
    }}
    {...rest}
  >
    <View style={{ width: "0.25in", alignItems: "center" }}>
      <Text style={{ fontSize: "10" }}>{`•`}</Text>
    </View>
    <View style={{ flexDirection: "column", flex: "1" }}>
      <Text style={{ fontSize: "10" }}>{children}</Text>
    </View>
  </View>
);

const Body = ({ children, ...rest }: TextProps & Props) => (
  <Text
    style={{
      fontSize: "10",
    }}
    {...rest}
  >
    {children}
  </Text>
);

export const Resume = () => (
  <Document>
    <ResumePage>
      <Header>
        <Text
          style={{
            fontFamily: "Poppins",
            fontWeight: "bold",
            fontSize: "22px",
          }}
        >
          {content.name}
        </Text>
        <Row>
          <Row style={{ gap: "2" }}>
            <Phone />
            <Link
              href={content.phone.link}
              style={{
                color: "black",
                textDecoration: "none",
                fontSize: "10pt",
                fontFamily: "Poppins",
              }}
            >
              {content.phone.text}
            </Link>
          </Row>

          <Seperator />

          <Row style={{ gap: "2" }}>
            <Email />
            <Link
              href={content.email.link}
              style={{
                color: "black",
                textDecoration: "none",
                fontSize: "10pt",
                fontFamily: "Poppins",
              }}
            >
              {content.email.text}
            </Link>
          </Row>

          <Seperator />

          <Row style={{ gap: "2" }}>
            <Home />
            <Link
              href={content.web.link}
              style={{
                color: "black",
                textDecoration: "none",
                fontSize: "10pt",
                fontFamily: "Poppins",
              }}
            >
              {content.web.text}
            </Link>
          </Row>
        </Row>
      </Header>

      <Section>
        <Section.Header>Professional Experience</Section.Header>
        {content.professional.map(({ name, location, roles }) => (
          <Company key={name}>
            <Company.Header>
              <Company.Name>{name}</Company.Name>
              <Company.Location>{location}</Company.Location>
            </Company.Header>
            {roles.map(({ name, start, end, points }) => (
              <Role key={name}>
                <Role.Header>
                  <Role.Name>{name}</Role.Name>
                  <Role.Duration>
                    {start} — {end ?? "Present"}
                  </Role.Duration>
                </Role.Header>
                {points.map((point) => (
                  <Point key={point}>{point}</Point>
                ))}
              </Role>
            ))}
          </Company>
        ))}
      </Section>
    </ResumePage>

    <ResumePage>
      <Section>
        <Section.Header>Education</Section.Header>
        {content.education.map(({ name, location, degrees }) => (
          <>
            <Company.Header key={name}>
              <Company.Name>{name}</Company.Name>
              <Company.Location>{location}</Company.Location>
            </Company.Header>

            {degrees.map(({ name, start, end }) => (
              <Role.Header key={name}>
                <Role.Name>{name}</Role.Name>
                <Role.Duration>
                  {start} — {end ?? "Present"}
                </Role.Duration>
              </Role.Header>
            ))}
          </>
        ))}
      </Section>

      <Section>
        <Section.Header>Expertise</Section.Header>
        {Object.entries(content.expertise).map(([name, value]) => (
          <Row style={{ justifyContent: "flex-start" }} key={name}>
            <Company.Name style={{ width: "1.5in" }}>{name}</Company.Name>
            <Body>{value}</Body>
          </Row>
        ))}
      </Section>
    </ResumePage>
  </Document>
);
