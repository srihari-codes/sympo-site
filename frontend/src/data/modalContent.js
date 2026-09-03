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
        date: "12.09.2026",
        time: "8:00",
        detail:
          "Desks open in the main foyer. Carry your college ID and the confirmation sent to your email.",
      },
      {
        id: "registration-end",
        name: "REGISTRATION END",
        icon: "clipboard",
        date: "12.09.2026",
        time: "9:00",
        detail:
          "Last call for on-desk registration. Brackets are locked after this point.",
      },
      {
        id: "inauguration-start",
        name: "INAUGURATION START",
        icon: "spark",
        date: "12.09.2026",
        time: "9:00",
        detail:
          "Formal opening of Zyverse 2K26, with an address from the department and the chief guest.",
      },
      {
        id: "event-commencement",
        name: "EVENT COMMENCEMENT",
        icon: "rocket",
        date: "12.09.2026",
        time: "10:00",
        detail:
          "All five events begin in parallel. Report to your assigned hall ten minutes ahead.",
      },
      {
        id: "lunch-break",
        name: "LUNCH BREAK",
        icon: "lunch",
        date: "12.09.2026",
        time: "12:30",
        detail:
          "Rounds in progress pause here and resume from the same state afterwards.",
      },
      {
        id: "event-resuming",
        name: "EVENT RESUMING",
        icon: "resume",
        date: "12.09.2026",
        time: "01:30",
        detail:
          "Afternoon rounds begin, running through to the finals of every event.",
      },
      {
        id: "valedictory",
        name: "PRIZE DISTRIBUTION & VALEDICTORY CEREMONY",
        icon: "trophy",
        date: "12.09.2026",
        time: "03:00",
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
    faculty: [
      // ── Core Team ──
      {
        id: "team-president",
        portrait: "/images/team/Gokul_Amaran_S.webp",
        name: "Gokul Amaran",
        designation: "President",
      },
      {
        id: "team-vice-president",
        portrait: "/images/team/Casandra.webp",
        name: "Cassandra Maria Wiltshire",
        designation: "Vice President",
      },
      {
        id: "team-secretary",
        portrait: "/images/team/srihari.webp",
        name: "Srihari",
        designation: "Secretary",
      },
      {
        id: "team-treasurer",
        portrait: "/images/team/Rakesh.webp",
        name: "Rakesh Kannan",
        designation: "Treasurer & Souvenir",
      },
      {
        id: "team-administrative",
        portrait: "/images/team/Durai.webp",
        name: "Durai",
        designation: "Administrative & Iron Throne Event Head",
      },
      {
        id: "team-anchoring",
        portrait: "/images/team/Sreelaya.webp",
        name: "Sreelaya",
        designation: "Anchoring",
      },
      {
        id: "team-joint-treasurer",
        portrait: "/images/team/Abishek.webp",
        name: "Abishek",
        designation: "Joint Treasurer",
      },
      {
        id: "team-joint-secretary",
        portrait: "/images/team/Anesh.webp",
        name: "Anesh",
        designation: "Joint Secretary",
      },


      // ── Event Organizers ──
      {
        id: "team-winter-war",
        portrait: "/images/team/Sai Shravan.webp",
        name: "Sai Shravan",
        designation: "Event Organizer — Winter War",
      },
      {
        id: "team-tessarions-trail",
        portrait: "/images/team/Saajith.webp",
        name: "Saajith",
        designation: "Event Organizer — Tessarion's Trail",
      },
      {
        id: "team-siege",
        portrait: "/images/team/Rakavi.webp",
        name: "Rakavi",
        designation: "Event Organizer — Siege of Servers",
      },
      {
        id: "team-scrolls",
        portrait: "/images/team/Dharshini.webp",
        name: "Dharshini",
        designation: "Event Organizer — Scrolls of the Realm",
      },

      // ── Committee Members ──
      {
        id: "team-discipline",
        portrait: "/images/team/Saahith.webp",
        name: "Saahith",
        designation: "Discipline Committee Head",
      },
      {
        id: "team-registration",
        portrait: "/images/team/ManojKumar.webp",
        name: "Manoj Kumar",
        designation: "Registration Head",
      },
      {
        id: "team-design",
        portrait: "/images/team/Naveen.webp",
        name: "Naveen",
        designation: "Designing & Documentation Head",
      },
      {
        id: "team-food",
        portrait: "/images/team/KarthikSelvam.webp",
        name: "Karthik Selvam",
        designation: "Food Committee Head",
      },
      {
        id: "team-reception",
        portrait: "/images/team/ShanmugaPriya.webp",
        name: "Shunmuga Priya",
        designation: "Reception Head",
      },
      {
        id: "team-promotion",
        portrait: "/images/team/Nithin.webp",
        name: "Nithin",
        designation: "Promotion Committee Head",
      },
      {
        id: "team-decoration",
        portrait: "/images/team/Harish.webp",
        name: "Harish",
        designation: "Decoration Head",
      },
      {
        id: "team-photography",
        portrait: "/images/team/Kishore.webp",
        name: "Kishore",
        designation: "Photography Head",
      },
      {
        id: "team-purchase",
        portrait: "/images/team/Karthikeyan.webp",
        name: "Karthikeyan",
        designation: "Purchase Committee Head",
      },
    ],
  },
};
