export const modalContent = {
  events: {
    title: "Events & Competitions",
    link: "https://zyverse.whitehatians.in",
    linkText: "Register Now (Fee: ₹150/-)",
    // Each poster is landscape (4:3 aspect ratio).
    eventList: [
      {
        id: "scrolls-of-the-realm",
        name: "Scrolls of the Realm",
        tagline: "Technical Paper & Research Presentation",
        category: "Paper Presentation",
        image: "/textures/Event_Posters/Scrolls_of_Realm.webp",
        description:
          "Providing opportunities for engineering students to showcase their innovative ideas and technical solutions. Participants can present their work in areas like cyber security, AI, Networking and computer science related fields.",
      },
      {
        id: "iron-throne",
        name: "Iron Throne",
        tagline: "Jeopardy-Style Capture The Flag (CTF)",
        category: "Jeopardy CTF",
        image: "/textures/Event_Posters/Iron_Throne.webp",
        description:
          "Iron Throne is a Jeopardy-style Capture the Flag (CTF) challenge where participants solve a series of cybersecurity tasks to uncover hidden flags. It tests skills in areas such as cryptography, web security, digital forensics, OSINT, reverse engineering, and network analysis. The goal is to solve challenges, collect flags, earn points, and climb the leaderboard.",
      },
      {
        id: "siege-of-servers",
        name: "Siege of Servers",
        tagline: "Attack-Defense CTF & Server Exploits",
        category: "Attack-Defense CTF",
        image: "/textures/Event_Posters/Siege_of_servers.webp",
        description:
          "An Attack-Defense CTF where teams compete to secure their own servers while finding and exploiting vulnerabilities in their opponents’ systems. Participants must balance offensive and defensive strategies through vulnerability exploitation and system hardening. The team that defends effectively, attacks successfully, and scores the most points wins.",
      },
      {
        id: "winter-war",
        name: "Winter War",
        tagline: "Boot2Root & Privilege Escalation CTF",
        category: "Boot2Root CTF",
        image: "/textures/Event_Posters/Winter_War.webp",
        description:
          "A Cybersecurity challenge where participants start with a vulnerable machine and work their way from initial access to full system control. The goal is to discover vulnerabilities, exploit them, escalate privileges, and capture the hidden flags.",
      },
      {
        id: "tessarions-trail",
        name: "Tessarion's Trail",
        tagline: "OSINT & Digital Forensics Investigation",
        category: "OSINT & Digital Forensics",
        image: "/textures/Event_Posters/Tessarians_Trail.webp",
        description:
          "The Participants investigate a crime using OSINT, connect clues and digital traces, uncover the criminal’s identity, and submit their name as the final flag.",
      },
    ],
  },
  schedule: {
    title: "Symposium Timeline",
    link: "https://zyverse.whitehatians.in",
    linkText: "Register at zyverse.whitehatians.in",
    // Every date and time below is a literal [DATE] / [TIME] placeholder so the
    // real schedule can be dropped in without hunting for plausible-looking
    // stand-ins that might otherwise ship by mistake.
    timeline: [
      {
        id: "registration-start",
        name: "REGISTRATION START",
        icon: "register",
        date: "[DATE]",
        time: "[TIME]",
        detail:
          "Desks open in the main foyer. Carry your college ID and the confirmation sent to your email.",
      },
      {
        id: "registration-end",
        name: "REGISTRATION END",
        icon: "clipboard",
        date: "[DATE]",
        time: "[TIME]",
        detail:
          "Last call for on-desk registration. Brackets are locked after this point.",
      },
      {
        id: "inauguration-start",
        name: "INAUGURATION START",
        icon: "spark",
        date: "[DATE]",
        time: "[TIME]",
        detail:
          "Formal opening of Zyverse 2K26, with an address from the department and the chief guest.",
      },
      {
        id: "event-commencement",
        name: "EVENT COMMENCEMENT",
        icon: "rocket",
        date: "[DATE]",
        time: "[TIME]",
        detail:
          "All five events begin in parallel. Report to your assigned hall ten minutes ahead.",
      },
      {
        id: "lunch-break",
        name: "LUNCH BREAK",
        icon: "lunch",
        date: "[DATE]",
        time: "[TIME]",
        detail:
          "Rounds in progress pause here and resume from the same state afterwards.",
      },
      {
        id: "event-resuming",
        name: "EVENT RESUMING",
        icon: "resume",
        date: "[DATE]",
        time: "[TIME]",
        detail:
          "Afternoon rounds begin, running through to the finals of every event.",
      },
      {
        id: "valedictory",
        name: "PRIZE DISTRIBUTION & VALEDICTORY CEREMONY",
        icon: "trophy",
        date: "[DATE]",
        time: "[TIME]",
        detail:
          "Winners announced across all five events, the ₹12,000/- prize pool distributed, then the closing ceremony.",
      },
    ],
  },
  staff_coordinators: {
    title: "Faculty",
    // Name, designation and department only — no bios or achievements here.
    faculty: [
      {
        id: "faculty-01",
        portrait: "/images/faculty/01.webp",
        name: "Dr. Dhanakoti V",
        designation: "Professor & Head of the Department",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-02",
        portrait: "/images/faculty/02.webp",
        name: "Dr. Santhana Marichamy V",
        designation: "Associate Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-03",
        portrait: "/images/faculty/03.webp",
        name: "Mr. Giridharan S",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-04",
        portrait: "/images/faculty/04.webp",
        name: "Ms. Nandhashree K R",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-05",
        portrait: "/images/faculty/05.webp",
        name: "Ms. Raghavi M",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-06",
        portrait: "/images/faculty/06.webp",
        name: "Mr. Rajkumar E",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-07",
        portrait: "/images/faculty/07.webp",
        name: "Ms. Sathya T",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-08",
        portrait: "/images/faculty/08.webp",
        name: "Ms. C. Jesifica Cinthamani",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-09",
        portrait: "/images/faculty/09.webp",
        name: "Mr. Avinesh Kumar G",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
    ],
    finale: {
      heading: "Meet the Minds Behind Excellence",
      vision: "To devise captivating, fascinating and unique practices of teaching that discovers the trained talent and inherent competences of young minds to evolve as humane professional Computer Science Engineers.",
      mission: "To provide students with challenging ventures, contributing to the betterment of their selfdom to compete with international talents. To act as a motivational hub to exhibit practical knowledge with the latest technological updates and research publications. To render ample knowledge to exhibit their ubiquitous talents for the social prosperity and promote industry-institute harmony to upgrade the standards for the international reputation.",
      invitation: "Reach out to the Department of Cyber Security at SRM Valliammai Engineering College to learn more about our programmes, research collaborations and industry partnerships.",
    },
  },
  zyverse_team: {
    title: "Zyverse Team",
    link: "https://zyverse.whitehatians.in",
    linkText: "Contact Coordinators",
    faculty: [
      // ── Core Team (photos needed) ──
      {
        id: "team-president",
        portrait: "/images/team/president.jpg",
        name: "Gokul Amaran",
        designation: "President",
      },
      {
        id: "team-vice-president",
        portrait: "/images/team/vice-president.jpg",
        name: "Cassandra Maria Wiltshire",
        designation: "Vice President",
      },
      {
        id: "team-secretary",
        portrait: "/images/team/Srihari.png",
        name: "Srihari",
        designation: "Secretary",
      },
      {
        id: "team-treasurer",
        portrait: "/images/team/treasurer.jpg",
        name: "Rakesh Kannan C K",
        designation: "Treasurer & Souvenir",
      },
      {
        id: "team-administrative",
        portrait: "/images/team/Durai.png",
        name: "Durai R",
        designation: "Administrative & Iron Thorne Event Head",
      },
      {
        id: "team-anchoring",
        portrait: "/images/team/anchoring.jpg",
        name: "Sreelaya S",
        designation: "Anchoring",
      },

      // ── Event Organizers (photos needed) ──
      {
        id: "team-scrolls",
        portrait: "/images/team/scrolls.jpg",
        name: "Dharshini",
        designation: "Event Organizer — Scrolls of the Realm",
      },
      {
        id: "team-tessarions-trail",
        portrait: "/images/team/tessarions-trail.jpg",
        name: "Saajith Ms",
        designation: "Event Organizer — Tessarion's Trail",
      },
      {
        id: "team-siege",
        portrait: "/images/team/siege.jpg",
        name: "Rakavi",
        designation: "Event Organizer — Siege of Servers",
      },
      {
        id: "team-winter-war",
        portrait: "/images/team/winter-war.jpg",
        name: "Sai Shravan",
        designation: "Event Organizer — Winter War",
      },

      // ── Committee Members (no photos) ──
      {
        id: "team-discipline",
        portrait: null,
        name: "Saahith G",
        designation: "Discipline Committee",
      },
      {
        id: "team-registration",
        portrait: null,
        name: "Manoj Kumar",
        designation: "Registration",
      },
      {
        id: "team-design",
        portrait: null,
        name: "Naveen N",
        designation: "Designing & Documentation",
      },
      {
        id: "team-food",
        portrait: null,
        name: "Karthik Selvam",
        designation: "Food Committee",
      },
      {
        id: "team-reception",
        portrait: null,
        name: "Shamuga Priya",
        designation: "Reception",
      },
      {
        id: "team-promotion",
        portrait: null,
        name: "Nithin Shyam",
        designation: "Promotion Committee",
      },
      {
        id: "team-decoration",
        portrait: null,
        name: "Harish K",
        designation: "Decoration",
      },
      {
        id: "team-purchase",
        portrait: null,
        name: "Karthikeyan",
        designation: "Purchase Committee",
      },
    ],
    finale: {
      heading: "Organized By",
      vision: "Department of Cyber Security, SRM Valliammai Engineering College",
      mission: "In association with SRMVEC CSI Student Branch, WhiteHatians Club & IQAC.",
    },
  },
};
