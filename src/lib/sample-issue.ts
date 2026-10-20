import { Issue } from './schema';

export const SAMPLE_ISSUE: Issue = {
  editionDate: '2026-10-21',
  headline: 'Open-Weight Multimodal Models Advance as Agentic Coding Tools Mature',
  summary:
    'Major research labs are releasing efficient open-weight models that run locally on consumer hardware, while developer tools introduce verified code generation environments.',
  readingTimeMinutes: 5,
  stories: [
    {
      title: 'Google Research Unveils On-Device Multimodal Reasoning Architecture',
      section: 'AI & Machine Learning',
      sourceName: 'Google Research',
      sourceUrl: 'https://blog.research.google/2026/10/on-device-multimodal-reasoning.html',
      whatHappened:
        'Google Research published details on a new hybrid architecture that compresses multimodal vision-language reasoning into a sub-3B parameter model capable of running smoothly on laptops and mobile devices.',
      whyItMatters:
        'As a first-year student, you do not need expensive GPU clusters to experiment with state-of-the-art vision and language models; local inference makes hands-on learning fast and zero-cost.',
      nextStep:
        'Clone the open-source demo repository and test running image understanding locally using WebAssembly or ONNX Runtime.',
    },
    {
      title: 'Hugging Face Introduces Unified Evaluation Benchmark for Code Agents',
      section: 'Developer Tools',
      sourceName: 'Hugging Face Blog',
      sourceUrl: 'https://huggingface.co/blog/code-agents-benchmark',
      whatHappened:
        'Hugging Face released an open evaluation framework that benchmarks how well autonomous coding assistants inspect git histories, debug syntax errors, and pass unit test suites.',
      whyItMatters:
        'Understanding how AI coding tools are evaluated helps you write cleaner, more testable code and prepares you for technical interviews where agent-assisted workflows are standard.',
      nextStep:
        'Explore the benchmark leaderboard on Hugging Face and review the top failure modes observed in automated code refactoring.',
    },
    {
      title: 'OpenAI Expands Structured Output Guarantees Across API Endpoints',
      section: 'AI & Systems',
      sourceName: 'OpenAI News',
      sourceUrl: 'https://openai.com/index/structured-outputs-api-guarantees',
      whatHappened:
        'OpenAI announced 100% schema compliance guarantees for JSON structured outputs across all production endpoints, preventing hallucinated keys and broken parsers.',
      whyItMatters:
        'Reliable JSON schemas mean backend developers can build production software with LLMs without writing brittle retry loops or regex extraction hacks.',
      nextStep:
        'Write a simple TypeScript script using Zod to validate AI-generated payloads in one of your coursework or portfolio projects.',
    },
    {
      title: 'GitHub Copilot Adds Workspace-Wide Dependency Graph Analysis',
      section: 'Developer Tools',
      sourceName: 'GitHub Blog',
      sourceUrl: 'https://github.blog/ai-and-ml/github-copilot/copilot-workspace-dependency-analysis',
      whatHappened:
        'GitHub integrated deep semantic graph analysis into Copilot, allowing suggestions to account for cross-file imports and types across entire multi-package repositories.',
      whyItMatters:
        'This reduces hallucinations when working in large open-source codebases, making it significantly easier for students to contribute their first pull request.',
      nextStep:
        'Find an open-source project on GitHub with the "good first issue" label and inspect its dependency graph before submitting a patch.',
    },
    {
      title: 'Global Semiconductor Consortium Outlines 2nm Production Roadmap',
      section: 'World Tech Brief',
      sourceName: 'BBC Technology',
      sourceUrl: 'https://www.bbc.com/news/technology-68912345',
      whatHappened:
        'Leading chip manufacturers reported yield milestones for 2-nanometer gate-all-around silicon wafers scheduled for widespread commercial availability next year.',
      whyItMatters:
        'Hardware efficiency directly shapes how much compute is available for AI training and determines the battery life of the devices we carry every day.',
      nextStep:
        'Read an overview of gate-all-around (GAA) transistor architecture to connect your physics/electronics courses with modern computing hardware.',
    },
  ],
  nextMoves: [
    {
      action:
        'Build a mini CLI tool that takes an RSS feed and summarizes top posts using a local or API-based model.',
      category: 'project',
      isVerifiedOpportunity: false,
    },
    {
      action:
        'Review the Hugging Face Open LLM leaderboard to understand how model parameters and quantization impact inference speed.',
      category: 'learning',
      isVerifiedOpportunity: false,
    },
    {
      action:
        'Star and explore active student hackathons on Devpost focused on generative AI and open-source tooling.',
      category: 'career',
      isVerifiedOpportunity: false,
    },
  ],
  glossary: [
    {
      term: 'Quantization',
      definition:
        'A technique that compresses neural networks by reducing numerical precision (e.g. from 16-bit floats to 4-bit integers), making models run faster on smaller hardware.',
    },
    {
      term: 'Agentic Workflow',
      definition:
        'A system where an AI model iteratively plans, calls external tools or APIs, inspects results, and corrects its own errors to complete multi-step tasks.',
    },
    {
      term: 'Structured Output',
      definition:
        'A mechanism forcing an AI model to return responses strictly adhering to a predefined data schema such as JSON or Protocol Buffers.',
    },
  ],
};
