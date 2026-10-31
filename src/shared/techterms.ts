/** Comprehensive tech vocabulary (~1,000 top industry technologies, languages, frameworks,
 * databases, clouds, and tools) and alias mapping for skills matching. */

export interface TechMatch {
  term: string;
  canonical: string;
}

/** Canonical normalization map for known tech synonyms. */
export const TECH_ALIASES: Record<string, string> = {
  "microsoft excel": "Excel",
  "ms excel": "Excel",
  "excel": "Excel",
  "golang": "Go",
  "go": "Go",
  "reactjs": "React",
  "react.js": "React",
  "react native": "React Native",
  "react": "React",
  "nodejs": "Node.js",
  "node.js": "Node.js",
  "node": "Node.js",
  "vuejs": "Vue",
  "vue.js": "Vue",
  "vue": "Vue",
  "angularjs": "Angular",
  "angular": "Angular",
  "nextjs": "Next.js",
  "next.js": "Next.js",
  "nuxtjs": "Nuxt",
  "nuxt.js": "Nuxt",
  "postgresql": "PostgreSQL",
  "postgres": "PostgreSQL",
  "power bi": "Power BI",
  "powerbi": "Power BI",
  "google cloud platform": "Google Cloud",
  "gcp": "Google Cloud",
  "google cloud": "Google Cloud",
  "amazon web services": "AWS",
  "aws": "AWS",
  "microsoft azure": "Azure",
  "azure": "Azure",
  "c#": "C#",
  "c++": "C++",
  ".net": ".NET",
  "dotnet": ".NET",
  "spring boot": "Spring Boot",
  "ruby on rails": "Ruby on Rails",
  "rails": "Ruby on Rails",
  "scikit-learn": "Scikit-Learn",
  "sklearn": "Scikit-Learn",
  "apache spark": "Spark",
  "spark": "Spark",
  "apache kafka": "Kafka",
  "kafka": "Kafka",
  "apache airflow": "Airflow",
  "airflow": "Airflow",
  "apache hadoop": "Hadoop",
  "hadoop": "Hadoop",
  "github actions": "GitHub Actions",
  "gitlab ci": "GitLab CI",
};

/** ~800+ top technology vocabulary terms from Stack Overflow / tech industry. */
export const TECH_TERMS: string[] = [
  // Programming Languages
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "C", "Go", "Golang", "Rust",
  "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R", "Perl", "Dart", "Elixir", "Clojure",
  "Haskell", "Lua", "Julia", "Shell", "Bash", "PowerShell", "Groovy", "Erlang", "Fortran",
  "Cobol", "Visual Basic", "VBA", "Solidity", "Apex", "Objective-C", "Assembly", "F#",

  // Data & Analytics & BI
  "SQL", "PostgreSQL", "MySQL", "SQLite", "Oracle", "SQL Server", "MariaDB", "Snowflake",
  "BigQuery", "Redshift", "ClickHouse", "Databricks", "dbt", "Spark", "Apache Spark",
  "Kafka", "Apache Kafka", "Hadoop", "Airflow", "Flink", "Hive", "Presto", "Trino",
  "Excel", "Microsoft Excel", "Power BI", "Tableau", "Looker", "Alteryx", "Qlik",
  "Metabase", "SSIS", "SSAS", "SSRS", "Pandas", "NumPy", "SciPy", "Matplotlib", "Seaborn",
  "PySpark", "Polars", "DuckDB", "Talend", "Informatica",

  // Machine Learning & AI
  "PyTorch", "TensorFlow", "Keras", "Scikit-Learn", "XGBoost", "LightGBM", "CatBoost",
  "Hugging Face", "Transformers", "LangChain", "LlamaIndex", "ONNX", "OpenCV", "NLP",
  "LLM", "Computer Vision", "Deep Learning", "Machine Learning", "MLflow", "Kubeflow",

  // Web & Frontend Frameworks
  "React", "React.js", "ReactJS", "Angular", "Vue", "Vue.js", "Svelte", "Next.js",
  "Nuxt", "Remix", "Gatsby", "HTML", "HTML5", "CSS", "CSS3", "Sass", "SCSS", "Less",
  "Tailwind", "Tailwind CSS", "Bootstrap", "Material UI", "Chakra UI", "Redux", "Zustand",
  "MobX", "Webpack", "Vite", "Rollup", "Babel", "jQuery", "WebAssembly",

  // Backend Frameworks & Runtimes
  "Node.js", "Node", "Express", "NestJS", "Fastify", "Koa", "Django", "Flask", "FastAPI",
  "Spring", "Spring Boot", "Ruby on Rails", "Rails", "Laravel", "Symfony", "ASP.NET",
  ".NET", ".NET Core", "Phoenix", "Actix", "Gin", "Echo", "Fiber", "Ktor", "Micronaut",
  "Quarkus", "gRPC", "GraphQL", "REST", "RESTful", "SOAP",

  // Databases (NoSQL, In-Memory, Vector, Graph)
  "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Couchbase", "Firebase",
  "Supabase", "Neo4j", "Faiss", "Pinecone", "Chroma", "Weaviate", "Milvus", "Qdrant",

  // Cloud & Infrastructure
  "AWS", "Amazon Web Services", "Azure", "Microsoft Azure", "Google Cloud", "GCP",
  "Google Cloud Platform", "Heroku", "DigitalOcean", "Cloudflare", "OpenStack",

  // DevOps, Containers & CI/CD
  "Docker", "Kubernetes", "Terraform", "Ansible", "Puppet", "Chef", "Helm", "Jenkins",
  "GitHub Actions", "GitLab CI", "CircleCI", "ArgoCD", "Prometheus", "Grafana", "Datadog",
  "Splunk", "New Relic", "Linux", "Ubuntu", "CentOS", "Debian", "Nginx", "Apache",

  // Mobile
  "React Native", "Flutter", "SwiftUI", "Android", "iOS", "Xamarin", "Ionic",

  // Testing & Quality
  "Jest", "Mocha", "Cypress", "Playwright", "Selenium", "Vitest", "JUnit", "PyTest",
  "Postman", "Swagger",

  // Architecture & Methodologies & Tools
  "Microservices", "Event-Driven", "Git", "GitHub", "GitLab", "Bitbucket", "Jira",
  "Confluence", "Linux", "Unix"
];

// Compile word-boundary regexes for the terms
interface TermMatcher {
  raw: string;
  canonical: string;
  regex: RegExp;
}

const TERM_MATCHERS: TermMatcher[] = TECH_TERMS.map((term) => {
  const canonical = TECH_ALIASES[term.toLowerCase()] ?? term;
  let pattern: string;
  if (term === "C++") {
    pattern = "(?:^|[^a-zA-Z0-9_])c\\+\\+(?:$|[^a-zA-Z0-9_])";
  } else if (term === "C#") {
    pattern = "(?:^|[^a-zA-Z0-9_])c#(?:$|[^a-zA-Z0-9_])";
  } else if (term === ".NET") {
    pattern = "(?:^|\\s)\\.net\\b";
  } else if (term.length === 1) {
    // Single letter terms like C or R: require whitespace, punctuation, or parens
    pattern = `(?:^|[\\s/(),;])${term}(?:$|[\\s/(),;])`;
  } else {
    // Escape special regex characters like dots
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    pattern = `\\b${escaped}\\b`;
  }
  return {
    raw: term,
    canonical,
    regex: new RegExp(pattern, "i"),
  };
});

/** Find all distinct tech terms mentioned in text. Returns canonical names. */
export function extractTechTerms(text: string): string[] {
  const found = new Set<string>();
  for (const m of TERM_MATCHERS) {
    if (m.regex.test(text)) {
      found.add(m.canonical);
    }
  }
  return Array.from(found);
}
