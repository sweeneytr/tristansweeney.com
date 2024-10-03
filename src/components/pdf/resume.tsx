import React from "react";
import { Document, Page, Text, View, Link } from "@react-pdf/renderer";
import { Email, Home, Phone } from "./icons";

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
    style={[
      {
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
      },
      style,
    ]}
    {...rest}
  >
    {children}
  </View>
);

Company.Name = ({
  style,
  children,
  ...rest
}: React.ComponentProps<typeof Text>) => (
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

Company.Location = ({
  children,
  ...rest
}: React.ComponentProps<typeof Text>) => (
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

Company.Role = ({
  children,
  style,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View style={{ marginBottom: "11px", ...style }} {...rest}>
    {children}
  </View>
);

Company.Role.Header = ({
  style,
  children,
  ...rest
}: React.ComponentProps<typeof View>) => (
  <View
    style={[
      {
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
      },
      style,
    ]}
    {...rest}
  >
    {children}
  </View>
);

Company.Role.Name = ({
  children,
  ...rest
}: React.ComponentProps<typeof Text>) => (
  <Text
    style={{
      fontSize: "10",
      textTransform: "uppercase",
      fontFamily: "Poppins",
    }}
    {...rest}
  >
    {children}
  </Text>
);

Company.Role.Duration = ({
  children,
  ...rest
}: React.ComponentProps<typeof Text>) => (
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

const Body = ({ children, ...rest }: React.ComponentProps<typeof Text>) => (
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
          Tristan A. Sweeney
        </Text>
        <Row>
          <Row style={{ gap: "2" }}>
            <Phone />
            <Link
              href="tel:+17323202075"
              style={{
                color: "black",
                textDecoration: "none",
                fontSize: "10pt",
                fontFamily: "Poppins",
              }}
            >
              (732)-320-2075
            </Link>
          </Row>

          <Seperator />

          <Row style={{ gap: "2" }}>
            <Email />
            <Link
              href="mailto:sweeneytri@gmail.com?subject=(From your resume)&body=Hi Tristan,\n\nI was interested by your resume, and wanted to have a conversation."
              style={{
                color: "black",
                textDecoration: "none",
                fontSize: "10pt",
                fontFamily: "Poppins",
              }}
            >
              sweeneytri@gmail.com
            </Link>
          </Row>

          <Seperator />

          <Row style={{ gap: "2" }}>
            <Home />
            <Link
              href="https://tristansweeney.com"
              style={{
                color: "black",
                textDecoration: "none",
                fontSize: "10pt",
                fontFamily: "Poppins",
              }}
            >
              tristansweeney.com
            </Link>
          </Row>
        </Row>
      </Header>

      <Section>
        <Section.Header>Professional Experience</Section.Header>
        <Company>
          <Company.Header>
            <Company.Name>DUST Identity</Company.Name>
            <Company.Location>Newton, Massachusetts</Company.Location>
          </Company.Header>
          <Company.Role>
            <Company.Role.Header>
              <Company.Role.Name>Staff Software Engineer</Company.Role.Name>
              <Company.Role.Duration>Oct 2023 — Present</Company.Role.Duration>
            </Company.Role.Header>
            <Point>
              Enabled customers to use DUST in mobile webapps by creating a
              customized mobile browser that extends the web environment with
              controls for DUST`s mobile hardware
            </Point>
            <Point>
              Reduced developer lock-in by migrating mobile codebase from Swift
              to React Native, enabling code and developer sharing across web
              and mobile projects
            </Point>
            <Point>
              Derived real-time events from legacy applications with Kafka,
              Debezium CDC, and KSQL ETL
            </Point>
            <Point>
              Demonstrated “verified delivery with DUST” concept by developing
              Shopify App integration
            </Point>
          </Company.Role>

          <Company.Role>
            <Company.Role.Header>
              <Company.Role.Name>Senior Software Engineer</Company.Role.Name>
              <Company.Role.Duration>Aug 2022 — Oct 2023</Company.Role.Duration>
            </Company.Role.Header>
            <Point>
              Reduced scope by replacing in-house auth with standardized OAuth2
              & OIDC IAM Infrastructure
            </Point>
            <Point>
              Accelerated development by rearchitecting legacy monolithic
              codebase into well-defined services
            </Point>
            <Point>
              Migrated authorization and business rules from in-code to OPA
              (Open Policy Agent) documents
            </Point>
            <Point>
              Eliminated deployment mishaps by migrating applications to be
              deployed and managed in Kubernetes
            </Point>
            <Point>
              Simplified authentication management by publishing open-source
              python packages for customers
            </Point>
            <Point>
              Mentored developers and interns in Python, FastAPI, RESTful API
              design, and HTTP best practices
            </Point>
          </Company.Role>

          <Company.Role>
            <Company.Role.Header>
              <Company.Role.Name>Software Engineer</Company.Role.Name>
              <Company.Role.Duration>Jan 2021 — Aug 2022</Company.Role.Duration>
            </Company.Role.Header>
            <Point>
              Implemented offline data transfer between air-gapped deployments
              of company services
            </Point>
            <Point>
              Led adoption of modern python tooling, linting, autoformatting,
              and package management
            </Point>
          </Company.Role>
        </Company>
        <Company>
          <Company.Header>
            <Company.Name>Amazon</Company.Name>
            <Company.Location>North Reading, Massachusetts</Company.Location>
          </Company.Header>
          <Company.Role>
            <Company.Role.Header>
              <Company.Role.Name>
                Software Development Engineer
              </Company.Role.Name>
              <Company.Role.Duration>May 2019 — Jan 2021</Company.Role.Duration>
            </Company.Role.Header>
            <Point>
              Achieved safety certification of embedded applications to IEC
              61508 and IEC 61784 standards
            </Point>
            <Point>
              Accelerated development by creating a library of certified data
              structures & asynchronous primitives
            </Point>
            <Point>
              Enabled collision avoidance by developing drivers for
              high-bandwidth I/O to transmit video streams
            </Point>
            <Point>
              Implemented access control for airline cargo hubs with embedded
              application for gate control boxes
            </Point>
          </Company.Role>
          <Company.Role>
            <Company.Role.Header>
              <Company.Role.Name>
                Software Development Engineer (co-op)
              </Company.Role.Name>
              <Company.Role.Duration>Jan 2017 — Sep 2017</Company.Role.Duration>
            </Company.Role.Header>
            <Point>
              Automated calibration of object detection system combining linear
              rail and robotic arm fixture, controlled with a LabView /
              TestStand GUI and a set of custom software and firmware drivers
            </Point>
            <Point>
              Improved LIDAR camera enclosure by developing visualizations from
              data to identify ambient noise
            </Point>
            <Point>
              Created benchmark data for obstacle-detection algorithms, using
              raycasting to generate synthetic data
            </Point>
          </Company.Role>
        </Company>

        <Company>
          <Company.Header>
            <Company.Name>Cambridge Consultants</Company.Name>
            <Company.Location>Boston, Massachusetts</Company.Location>
          </Company.Header>
          <Company.Role>
            <Company.Role.Header>
              <Company.Role.Name>Software Engineer (co-op)</Company.Role.Name>
              <Company.Role.Duration>Jul 2018 — Dec 2018</Company.Role.Duration>
            </Company.Role.Header>
            <Point>
              Delivered firmware for wireless headphones, using Bluetooth in
              regular, low-energy, and music profiles
            </Point>
            <Point>
              Enabled in-office training of ML and AI workloads by establishing
              a GPU enabled Kubernetes cluster
            </Point>
            <Point>
              Developed AI foosball bot for sales demos, integrating hardware,
              firmware, and python interfaces
            </Point>
          </Company.Role>
        </Company>

        <Company>
          <Company.Header>
            <Company.Name>NVIDIA</Company.Name>
            <Company.Location>Santa Clara, California</Company.Location>
          </Company.Header>
          <Company.Role>
            <Company.Role.Header>
              <Company.Role.Name>
                Compute Architecture Engineer (co-op)
              </Company.Role.Name>
              <Company.Role.Duration>Jan 2016 — Sep 2016</Company.Role.Duration>
            </Company.Role.Header>
            <Point>
              Forecasted demand for GPUs by modeling performance for popular
              deep learning architectures
            </Point>
            <Point>
              Eliminated stale-data confusion with excel macros to auto-update
              spreadsheets from databases
            </Point>
          </Company.Role>
        </Company>
      </Section>
    </ResumePage>

    <ResumePage>
      <Section>
        <Section.Header>Education</Section.Header>
        <Company.Header>
          <Company.Name>Northeastern University</Company.Name>
          <Company.Location>Boston, Massachusetts</Company.Location>
        </Company.Header>

        <Company.Role.Header>
          <Company.Role.Name>
            M.S. in Computer Engineering (Systems & Software)
          </Company.Role.Name>
          <Company.Role.Duration>Sep 2017 — May 2019</Company.Role.Duration>
        </Company.Role.Header>
        <Company.Role.Header>
          <Company.Role.Name>B.S. in Computer Engineering</Company.Role.Name>
          <Company.Role.Duration>Sep 2014 — May 2019</Company.Role.Duration>
        </Company.Role.Header>
      </Section>

      <Section>
        <Section.Header>Expertise</Section.Header>
        <Row style={{ justifyContent: "flex-start" }}>
          <Company.Name style={{ width: "1.5in" }}>Programming</Company.Name>
          <Body>
            Python, JavaScript / TypeScript, C / C++, Rust, Assembly, Bash, Go,
            Haskell
          </Body>
        </Row>

        <Row style={{ justifyContent: "flex-start" }}>
          <Company.Name style={{ width: "1.5in" }}>Web</Company.Name>
          <Body>
            React, Vite, Remix, NextJS, React Router, React Admin, Prisma, HTML
            / CSS
          </Body>
        </Row>

        <Row style={{ justifyContent: "flex-start" }}>
          <Company.Name style={{ width: "1.5in" }}>Cloud</Company.Name>
          <Body>AWS, AWS CDK, Docker, Kubernetes, Ansible</Body>
        </Row>

        <Row style={{ justifyContent: "flex-start" }}>
          <Company.Name style={{ width: "1.5in" }}>Fundamentals</Company.Name>
          <Body>
            Git, Linux CLI, systemd, Data Structures & Algorithms, Package
            Management
          </Body>
        </Row>

        <Row style={{ justifyContent: "flex-start" }}>
          <Company.Name style={{ width: "1.5in" }}>Networking</Company.Name>
          <Body>
            TCP / UDP / IP, HTTP, RAFT consensus, IEC 61784 safety communication
          </Body>
        </Row>

        <Row style={{ justifyContent: "flex-start" }}>
          <Company.Name style={{ width: "1.5in" }}>Embedded</Company.Name>
          <Body>
            IEC 61508 safety compliance, peripheral drivers, RTOS, libC, POSIX
          </Body>
        </Row>
      </Section>
    </ResumePage>
  </Document>
);
