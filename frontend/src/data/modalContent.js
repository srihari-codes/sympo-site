export const modalContent = {
  events: {
    title: "Events & Competitions",
    link: "https://zyverse.whitehatians.in",
    linkText: "Register Now (Fee: ₹150/-)",
    // Placeholder art for now — each poster is framed 16:9, so swap in
    // landscape artwork per event.
    eventList: [
      {
        id: "scrolls-of-the-realm",
        name: "Scrolls of the Realm",
        tagline: "Technical Paper & Research Presentation",
        image: "/textures/event_poster.png",
        description:
          "Present original research to a panel of faculty and industry reviewers. Submit an abstract ahead of the symposium, then defend your work in a timed presentation followed by open questions. Papers across cyber security, AI and emerging technology are all welcome.",
      },
      {
        id: "iron-throne",
        name: "Iron Throne",
        tagline: "Competitive Coding & Algorithmic Conquest",
        image: "/textures/event_poster.png",
        description:
          "A timed programming contest that escalates from warm-up problems to hard algorithmic challenges. Each round narrows the field until only a handful remain to contest the final. Bring the language of your choice — solutions are judged on correctness first, runtime second.",
      },
      {
        id: "siege-of-servers",
        name: "Siege of Servers",
        tagline: "Cyber Defence, Capture The Flag & Network Exploits",
        image: "/textures/event_poster.png",
        description:
          "A jeopardy-style CTF spanning web exploitation, cryptography, digital forensics and network defence. Flags carry escalating point values and a live scoreboard tracks every capture right up to the final lockout.",
      },
      {
        id: "winter-war",
        name: "Winter War",
        tagline: "High-Intensity Technical & Gaming Arena",
        image: "/textures/event_poster.png",
        description:
          "A fast knockout bracket pairing technical quickfire rounds with competitive gaming. Teams advance through elimination stages where reaction speed counts for as much as accuracy.",
      },
      {
        id: "tessarions-trail",
        name: "Tessarion's Trail",
        tagline: "Cryptic Treasure Hunt & Cipher Quest",
        image: "/textures/event_poster.png",
        description:
          "A campus-wide hunt built on layered ciphers and cryptic clues. Every riddle you break unlocks the next coordinate, and the first team to reach the final vault takes the prize.",
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
    link: "https://zyverse.whitehatians.in",
    linkText: "Contact the Department",
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
        name: "[FACULTY NAME 05]",
        designation: "[DESIGNATION 05]",
        department: "Department of Cyber Security",
        expertise: ["[EXPERTISE A]", "[EXPERTISE B]", "[EXPERTISE C]"],
        bio: "[BIOGRAPHY 05 — two or three sentences on background, teaching focus and what this faculty member is known for within the department.]",
        achievement: "[ACHIEVEMENT 05]",
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
        name: "[FACULTY NAME 07]",
        designation: "[DESIGNATION 07]",
        department: "Department of Cyber Security",
        expertise: ["[EXPERTISE A]", "[EXPERTISE B]", "[EXPERTISE C]"],
        bio: "[BIOGRAPHY 07 — two or three sentences on background, teaching focus and what this faculty member is known for within the department.]",
        achievement: "[ACHIEVEMENT 07]",
      },
      {
        id: "faculty-08",
        portrait: "/images/faculty/08.jpg",
        name: "[FACULTY NAME 08]",
        designation: "[DESIGNATION 08]",
        department: "Department of Cyber Security",
        expertise: ["[EXPERTISE A]", "[EXPERTISE B]", "[EXPERTISE C]"],
        bio: "[BIOGRAPHY 08 — two or three sentences on background, teaching focus and what this faculty member is known for within the department.]",
        achievement: "[ACHIEVEMENT 08]",
      },
      {
        id: "faculty-09",
        portrait: "/images/faculty/09.jpg",
        name: "[FACULTY NAME 09]",
        designation: "[DESIGNATION 09]",
        department: "Department of Cyber Security",
        expertise: ["[EXPERTISE A]", "[EXPERTISE B]", "[EXPERTISE C]"],
        bio: "[BIOGRAPHY 09 — two or three sentences on background, teaching focus and what this faculty member is known for within the department.]",
        achievement: "[ACHIEVEMENT 09]",
      },
    ],
    finale: {
      heading: "Meet the Minds Behind Excellence",
      vision: "[DEPARTMENT VISION — one or two sentences.]",
      mission: "[DEPARTMENT MISSION — one or two sentences.]",
      invitation: "[CALL TO CONNECT — how prospective students and collaborators should reach the department.]",
    },
  },
  zyverse_team: {
    title: "Student Coordinators",
    link: "https://zyverse.whitehatians.in",
    linkText: "Contact Coordinators",
    paragraphs: [
      "Gokul Amaran S — Student Coordinator (Ph: 8870961327)",
      "Cassandra Maria Wiltshire — Student Coordinator (Ph: 9150676611)",
      "Organized by Department of Cyber Security in association with SRMVEC CSI Student Branch, WhiteHatians Club & IQAC.",
    ],
  },
};
