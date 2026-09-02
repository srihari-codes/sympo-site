export const modalContent = {
  events: {
    title: "Events & Competitions",
    link: "https://zyverse.whitehatians.in",
    linkText: "Register Now (Fee: ₹150/-)",
    // Each poster is framed 3:4 portrait (1587×2245 px), so use
    // landscape artwork per event.
    eventList: [
      {
        id: "scrolls-of-the-realm",
        name: "Scrolls of the Realm",
        tagline: "Technical Paper & Research Presentation",
        image: "/textures/Event_Posters/Scrolls_of_Realm.png",
        description:
          "Providing opportunities for engineering students to showcase their innovative ideas and technical solutions. Participants can present their work in areas like cyber security, AI, Networking and computer science related fields.",
      },
      {
        id: "iron-throne",
        name: "Iron Throne",
        tagline: "Competitive Coding & Algorithmic Conquest",
        image: "/textures/Event_Posters/Iron_Throne.png",
        description:
          "Iron Throne is a Jeopardy-style Capture the Flag (CTF) challenge where participants solve a series of cybersecurity tasks to uncover hidden flags. It tests skills in areas such as cryptography, web security, digital forensics, OSINT, reverse engineering, and network analysis. The goal is to solve challenges, collect flags, earn points, and climb the leaderboard.",
      },
      {
        id: "siege-of-servers",
        name: "Siege of Servers",
        tagline: "Cyber Defence, Capture The Flag & Network Exploits",
        image: "/textures/Event_Posters/Siege_of_Servers.png",
        description:
          "An Attack-Defense CTF where teams compete to secure their own servers while finding and exploiting vulnerabilities in their opponents’ systems. Participants must balance offensive and defensive strategies through vulnerability exploitation and system hardening. The team that defends effectively, attacks successfully, and scores the most points wins.",
      },
      {
        id: "winter-war",
        name: "Winter War",
        tagline: "High-Intensity Technical & Gaming Arena",
        image: "/textures/Event_Posters/Winter_War.png",
        description:
          "A Cybersecurity challenge where participants start with a vulnerable machine and work their way from initial access to full system control. The goal is to discover vulnerabilities, exploit them, escalate privileges, and capture the hidden flags.",
      },
      {
        id: "tessarions-trail",
        name: "Tessarion's Trail",
        tagline: "Cryptic Treasure Hunt & Cipher Quest",
        image: "/textures/Event_Posters/Tessarians_Trail.png",
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
    // Every field below is a bracketed placeholder, and portraits are null so
    // nothing renders a broken image before the real assets land.
    faculty: [
      {
        id: "faculty-01",
        portrait: "/images/faculty/01.jpg",
        name: "Dr. Dhanakoti V",
        designation: "Professor & Head of the Department",
        department: "Department of Cyber Security",
        expertise: [
          "Network Security",
          "Computer Science Information Systems",
          "Cloud Security",
        ],
        bio:
          "Dr. Dhanakoti V is a Professor at SRM Valliammai Engineering College with extensive academic and research experience in Computer Science and Engineering. His areas of expertise include Network Security and Computer Science Information Systems, with research contributions spanning intrusion detection, cloud security, blockchain, and data-centre technologies. He has also guided doctoral research in advanced cybersecurity and cloud-computing domains.",
        achievement: "275 Citations · 7 h-index · 30 Publications",
      },
      {
        id: "faculty-02",
        portrait: "/images/faculty/02.jpg",
        name: "Dr. Santhana Marichamy V",
        designation: "Associate Professor",
        department: "Department of Cyber Security",
        expertise: [
          "Computer Science Information Systems",
          "Computer Science & Engineering",
          "Cybersecurity",
        ],
        bio:
          "Dr. Santhana Marichamy V is an Associate Professor with extensive teaching and academic experience in Computer Science and Engineering. His areas of expertise include Computer Science Information Systems and Computer Science and Engineering, with more than two decades of experience in higher education and continued involvement in research and professional academic activities.",
        achievement: "54 Citations · 3 h-index · 11 Publications",
      },
      {
        id: "faculty-03",
        portrait: "/images/faculty/03.jpg",
        name: "Mr. Giridharan S",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
        expertise: [
          "Computer Science Information Systems",
          "Cybersecurity",
          "Information Technology",
        ],
        bio:
          "Mr. Giridharan S is an Assistant Professor in the Department of Cyber Security at SRM Valliammai Engineering College, with several years of teaching experience across Computer Science, Information Technology, and Cyber Security. His academic interests are centered on Computer Science Information Systems, supported by experience in higher education and ongoing research contributions in the field.",
        achievement: "3 Citations · 1 h-index · 13 Publications",
      },
      {
        id: "faculty-04",
        portrait: "/images/faculty/04.jpg",
        name: "Ms. Nandhashree K R",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
        expertise: [
          "Computer Science Cybernetics",
          "Image Processing",
          "Cybersecurity",
        ],
        bio:
          "Ms. Nandhashree K R is an Assistant Professor in the Department of Cyber Security at SRM Valliammai Engineering College. She has experience in Computer Science Cybernetics and Image Processing, with an academic background in engineering and a focus on teaching and developing expertise within emerging computing and cybersecurity domains.",
        achievement: "Computer Society of India — Life Member",
      },
      {
        id: "faculty-05",
        portrait: "/images/faculty/05.jpg",
        name: "Ms. Raghavi M",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-06",
        portrait: "/images/faculty/06.jpg",
        name: "Mr. Rajkumar E",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
        expertise: [
          "Computer Science Cybernetics",
          "Landscape",
          "Cybersecurity",
        ],
        bio:
          "Mr. Rajkumar E is an Assistant Professor in the Department of Cyber Security at SRM Valliammai Engineering College. His academic expertise includes Computer Science Cybernetics and Landscape, supported by teaching experience across Cyber Security, Information Technology, and Computer Science. He is also actively involved in academic and institutional activities, including anti-ragging initiatives.",
        achievement: "1 Citation · 1 h-index · 11 Publications",
      },
      {
        id: "faculty-07",
        portrait: "/images/faculty/07.jpg",
        name: "Ms. Sathya T",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-08",
        portrait: "/images/faculty/08.jpg",
        name: "Ms. C. Jesifica Cinthamani",
        designation: "Assistant Professor",
        department: "Department of Cyber Security",
      },
      {
        id: "faculty-09",
        portrait: "/images/faculty/09.jpg",
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
