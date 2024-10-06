export const content = {
  name: "Tristan A. Sweeney",
  phone: {
    link: "+17323202075",
    text: "(732) 320-2075",
  },
  email: {
    link: "mailto:sweeneytri@gmail.com?subject=(From your resume)&body=Hi Tristan,\n\nI was interested by your resume, and wanted to have a conversation.",
    text: "sweeneytri@gmail.com",
  },
  web: {
    link: "https://tristansweeney.com",
    text: "tristansweeney.com",
  },
  professional: [
    {
      name: "DUST Identity",
      location: "Newton, Massachusetts",
      roles: [
        {
          name: "Staff Software Engineer",
          start: "Oct 2023",
          points: [
            "Enabled customers to use DUST in mobile webapps by creating a customized mobile browser that extends the web environment with controls for DUST's mobile hardware",
            "Reduced developer lock-in by migrating mobile codebase from Swift to React Native, enabling code and developer sharing across web and mobile projects",
            "Derived real-time events from legacy applications with Kafka, Debezium CDC, and KSQL ETL",
            'Demonstrated "verified delivery with DUST" concept by developing Shopify App integration',
          ],
        },
        {
          name: "Senior Software Engineer",
          start: "Aug 2022",
          end: "Oct 2023",
          points: [
            "Reduced scope by replacing in-house auth with standardized OAuth2 & OIDC IAM Infrastructure",
            `Accelerated development by rearchitecting legacy monolithic codebase into well-defined services`,
            `Migrated authorization and business rules from in-code to OPA (Open Policy Agent) documents`,
            `Eliminated deployment mishaps by migrating applications to be deployed and managed in Kubernetes`,
            `Simplified authentication management by publishing open-source python packages for customers`,
            `Mentored developers and interns in Python, FastAPI, RESTful API design, and HTTP best practices`,
          ],
        },
        {
          name: "Software Engineer",
          start: "Jan 2021",
          end: "Aug 2022",
          points: [
            "Implemented offline data transfer between air-gapped deployments of company services",
            `Led adoption of modern python tooling, linting, autoformatting, and package management`,
          ],
        },
      ],
    },
    {
      name: "Amazon",
      location: "North Reading, Massachusetts",
      roles: [
        {
          name: "Software Development Engineer",
          start: "May 2019",
          end: "Jan 2021",
          points: [
            "Achieved safety certification of embedded applications to IEC 61508 and IEC 61784 standards",
            "Accelerated development by creating a library of certified data structures and asynchronous primitives",
            "Enabled collision avoidance by developing high-bandwidth I/O drivers to transmit video streams",
            "Implemented access control for airline cargo hubs with embedded application for gate control boxes",
          ],
        },
        {
          name: "Software Development Engineer (co-op)",
          start: "Jan 2017",
          end: "Sep 2017",
          points: [
            "Automated calibration of object detection system combining linear rail and robotic arm fixture, controlled with a LabView / TestStand GUI and a set of custom software and firmware drivers",
            "Improved LIDAR camera enclosure by developing visualizations from data to identify ambient noise",
            "Created benchmark data for obstacle-detection algorithms, using raycasting to generate synthetic data",
          ],
        },
      ],
    },
    {
      name: "Cambridge Consultants",
      location: "Boston, Massachusetts",
      roles: [
        {
          name: "Software Engineer (co-op)",
          start: "Jul 2018",
          end: "Sep 2018",
          points: [
            "Delivered firmware for wireless headphones, using Bluetooth inmregular, low-energy, and music profiles",
            "Enabled in-office training of ML and AI workloads by establishing a GPU enabled Kubernetes cluster",
            "Developed AI foosball bot for sales demos, integrating hardware, firmware, and python interfaces",
          ],
        },
      ],
    },
    {
      name: "NVIDIA",
      location: "Santa Clara, California",
      roles: [
        {
          name: "Compute Architecture Engineer (co-op)",
          start: "Jan 2016",
          end: "Sep 2016",
          points: [
            "Forecasted demand for GPUs by modeling performance for popular deep learning architectures",
            "Eliminated stale-data confusion with excel macros to auto-update spreadsheets from databases",
          ],
        },
      ],
    },
  ],
  education: [
    {
      name: "Northeastern University",
      location: "Boston, Massachusetts",
      degrees: [
        {
          name: "M.S. in Computer Engineering (Systems & Software)",
          start: "Sep 2017",
          end: "May 2019",
        },
        {
          name: "B.S. in Computer Engineering",
          start: "Sep 2014",
          end: "May 2019",
        },
      ],
    },
  ],
  expertise: {
    programming:
      "Python, JavaScript / TypeScript, C / C++, Rust, Assembly, Bash, Go, Haskell",
    web: "React, Vite, Remix, NextJS, React Router, React Admin, Prisma, HTML / CSS",
    mobile: "React Native, Expo, Tamagui",
    cloud: "AWS, AWS CDK, Docker, Kubernetes, Ansible",
    fundamentals:
      "Git, Linux CLI, systemd, Data Structures & Algorithms, Package Management",
    networking:
      "TCP / UDP / IP, HTTP, RAFT consensus, IEC 61784 safety communication",
    embedded:
      "IEC 61508 safety compliance, peripheral drivers, RTOS, libC, POSIX",
  },
};
