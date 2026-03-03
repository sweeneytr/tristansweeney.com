import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  type TextProps,
  type LinkProps,
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
  <View style={{ marginBottom: "6", ...style }} {...rest}>
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
      fontFamily: "Poppins",
    }}
    {...rest}
  >
    {children}
  </Text>
);

const SneakyLink = ({ children, ...rest }: LinkProps & Props) => (
  <Link
    style={{
      color: "black",
      textDecoration: "none",
      fontSize: "10pt",
      fontFamily: "Poppins",
    }}
    {...rest}
  >
    {children}
  </Link>
);

export const CoverLetter = () => (
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
          {[
            { icon: <Phone />, ...content.phone },
            { icon: <Email />, ...content.email },
            { icon: <Home />, ...content.web },
          ].map(({ icon, text, link }, index, row) => (
            <>
              <Row style={{ gap: "2" }}>
                {icon}
                <SneakyLink href={link}>{text}</SneakyLink>
              </Row>
              {index + 1 !== row.length && <Seperator />}
            </>
          ))}
        </Row>
      </Header>

      <Role.Header style={{ marginBottom: "0.5in" }}>
        <Role.Name style={{ lineHeight: "1.1", textTransform: undefined }}>
          {"Hiring Manager\nHubSpot, Inc.\n2 Canal Park\nCambridge, MA 02141"}
        </Role.Name>
        <Role.Duration>
          {new Date().toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </Role.Duration>
      </Role.Header>

      <View style={{ marginBottom: "0.25in" }}>
        <Body>Dear Hiring Manager,</Body>
      </View>

      <View style={{ gap: "0.125in" }}>
        <Body>
          I am writing to express my interest in the Senior Software Engineer II
          position with HubSpot, Inc. that is currently posted your website. I
          have been a fan of HubSpot's technical and design resources and blog
          posts for quite some time and am excited about the possibility of
          joining the team. I've heard both firsthand and second that HubSpot
          has an excellent culture and is a great workplace, and would love to
          bring the breadth and depth of my technical skills to this position.
        </Body>

        <Body>
          My love of software began in high school when I learned C, C++, and C#
          attempting game development as a hobby. It was only for fun, as I'd
          taken many Science and Math AP courses, as well as summer courses at a
          local community college before freshman year. I entered Northeastern
          University expecting to focus on a hard engineering discipline, yet I
          was drawn inexorably back to the joys of software.
        </Body>

        <Body>
          Software developers have the unique gift of being able to deliver
          massive impact, limited only by their imagination in arranging code
          and concepts in useful and powerful ways. Over my career I've worked
          across all sorts of software and hardware projects. In doing so, I've
          come to value making an impact with my work, and begun to seek out
          larger opportunities to do so.
        </Body>

        <Body>
          I'm confident my professional skills, team-player attitude, and desire
          to deliver results will be a valuable addition to HubSpot. It'd be a
          pleasure to work at such a well-respected company. I look forward to
          the opportunity to interview with you to further discuss my
          qualifications for the position. If you have any questions or would
          like me to provide any additional information, please feel free to
          contact me.
        </Body>

        <Body>Thank you for your time in considering my resume.</Body>
      </View>

      <View style={{ marginTop: "0.25in" }}>
        <Body>Sincerely,</Body>
        <View style={{ marginLeft: "0.25in" }}>
          <Body>Tristan Sweeney</Body>
        </View>
      </View>
    </ResumePage>
  </Document>
);
