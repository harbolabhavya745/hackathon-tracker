export interface HackathonTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  team_size_limit: number;
  dates: Array<{
    label: string;
    offsetDays: number; // Offset from start date
    type: 'event' | 'deadline' | 'milestone' | 'info';
  }>;
  tasks: Array<{
    title: string;
    priority: 'high' | 'med' | 'low';
  }>;
}

export const HACKATHON_TEMPLATES: HackathonTemplate[] = [
  {
    id: 'sprint_48h',
    name: '48-Hour Weekend Sprint',
    description: 'Standard Devpost / Devfolio online hackathon with fast build and video submission.',
    icon: 'ti-bolt',
    tags: ['Online', '48h', 'MVP'],
    team_size_limit: 4,
    dates: [
      { label: 'Team Registration Deadline', offsetDays: 0, type: 'deadline' },
      { label: 'Hacking Kick-off', offsetDays: 0, type: 'event' },
      { label: 'Soft Code Freeze & Video Recording', offsetDays: 2, type: 'milestone' },
      { label: 'Final Submission Deadline', offsetDays: 2, type: 'deadline' },
      { label: 'Winners & Results Announcement', offsetDays: 5, type: 'event' }
    ],
    tasks: [
      { title: 'Brainstorm idea and select prize tracks', priority: 'high' },
      { title: 'Set up GitHub repo, project board, and Discord group', priority: 'med' },
      { title: 'Build core feature MVP', priority: 'high' },
      { title: 'Test end-to-end user flow and fix critical bugs', priority: 'high' },
      { title: 'Record 2-3 minute YouTube / Loom video demo', priority: 'high' },
      { title: 'Write Devpost README with architecture & screenshots', priority: 'med' },
      { title: 'Submit project and verify submission URL', priority: 'high' }
    ]
  },
  {
    id: 'multiround_college',
    name: 'Multi-Round Grand Challenge',
    description: 'Multi-stage university / corporate competition: Abstract PPT -> Prototype -> Finale Pitch.',
    icon: 'ti-trophy',
    tags: ['Multi-Stage', 'College', 'Pitch'],
    team_size_limit: 4,
    dates: [
      { label: 'Round 1: Abstract & PPT Submission', offsetDays: 7, type: 'deadline' },
      { label: 'Round 1 Shortlist Announcement', offsetDays: 14, type: 'milestone' },
      { label: 'Round 2: Working Prototype & Video Demo', offsetDays: 24, type: 'deadline' },
      { label: 'Grand Finale & Live Jury Pitch', offsetDays: 30, type: 'event' }
    ],
    tasks: [
      { title: 'Prepare Problem Statement & Proposed Solution PPT', priority: 'high' },
      { title: 'Submit Round 1 Abstract submission portal', priority: 'high' },
      { title: 'Build Functional Prototype / Alpha Version', priority: 'high' },
      { title: 'Host live staging demo on Vercel / Cloud', priority: 'med' },
      { title: 'Design Finalist Pitch Deck (10 slides)', priority: 'high' },
      { title: 'Rehearse 5-min live demo and Q&A responses', priority: 'med' }
    ]
  },
  {
    id: 'ai_challenge',
    name: 'AI & Machine Learning Sprint',
    description: 'Focused on model training, fine-tuning, evaluation metrics, and interactive Gradio/Streamlit UI.',
    icon: 'ti-cpu',
    tags: ['AI', 'LLM', 'GenAI'],
    team_size_limit: 3,
    dates: [
      { label: 'Dataset Access & Problem Release', offsetDays: 0, type: 'event' },
      { label: 'Midway Evaluation & Benchmark Submissions', offsetDays: 3, type: 'milestone' },
      { label: 'Final Code & Model Weights Freeze', offsetDays: 7, type: 'deadline' },
      { label: 'Leaderboard Evaluation', offsetDays: 9, type: 'event' }
    ],
    tasks: [
      { title: 'Explore dataset & clean exploratory data analysis (EDA)', priority: 'high' },
      { title: 'Build baseline pipeline with prompt engineering / fine-tuning', priority: 'high' },
      { title: 'Integrate LLM API (Gemini / OpenAI / Anthropic)', priority: 'med' },
      { title: 'Create interactive web UI (Streamlit / Next / Vite)', priority: 'high' },
      { title: 'Record benchmark results and write methodology report', priority: 'med' },
      { title: 'Publish demo and submission link', priority: 'high' }
    ]
  },
  {
    id: 'web3_bounty',
    name: 'Web3 & Open-Source Bounty',
    description: 'Smart contract development, testnet deployment, audited repos, and dApp frontend.',
    icon: 'ti-brand-github',
    tags: ['Web3', 'OpenSource', 'DeFi'],
    team_size_limit: 4,
    dates: [
      { label: 'Bounty Tracks Announced', offsetDays: 0, type: 'info' },
      { label: 'Testnet Contract Deployment Deadline', offsetDays: 3, type: 'milestone' },
      { label: 'Final Repo & Sponsor Track Submission', offsetDays: 5, type: 'deadline' }
    ],
    tasks: [
      { title: 'Review sponsor bounty requirements & SDKs', priority: 'high' },
      { title: 'Develop smart contracts and run test suites', priority: 'high' },
      { title: 'Deploy contracts to testnet and verify on block explorer', priority: 'high' },
      { title: 'Connect wallet frontend (wagmi/viem/ethers)', priority: 'med' },
      { title: 'Tag partner sponsor tracks in submission description', priority: 'high' }
    ]
  }
];
