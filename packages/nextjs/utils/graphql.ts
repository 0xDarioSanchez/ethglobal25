const ENVIO_GRAPHQL_URL = "http://localhost:8080/v1/graphql";

export interface EventData {
  id: string;
  [key: string]: any;
}

export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

export interface EntityInfo {
  name: string;
  fields: Array<{
    name: string;
    type: string;
  }>;
}

// Parse GraphQL schema to extract entity information
export function parseSchemaEntities(schemaContent: string): EntityInfo[] {
  const entities: EntityInfo[] = [];
  const lines = schemaContent.split("\n");

  let currentEntity: EntityInfo | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Check for type definition - schema.graphql only contains event entities
    if (trimmedLine.startsWith("type ") && !trimmedLine.includes("(")) {
      const typeName = trimmedLine.replace("type ", "").replace(" {", "").trim();

      // All types in schema.graphql are event entities, so include them all
      if (typeName) {
        currentEntity = {
          name: typeName,
          fields: [],
        };
        entities.push(currentEntity);
      }
    }

    // Parse fields within a type
    if (currentEntity && trimmedLine.includes(":") && !trimmedLine.startsWith("type ")) {
      const fieldMatch = trimmedLine.match(/(\w+):\s*([^!]+)/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldType = fieldMatch[2].replace("!", "").trim();
        currentEntity.fields.push({
          name: fieldName,
          type: fieldType,
        });
      }
    }

    // Reset when we hit a closing brace
    if (trimmedLine === "}") {
      currentEntity = null;
    }
  }

  return entities;
}

// Generate dynamic queries based on schema entities
export function generateEventCountsQuery(entities: EntityInfo[]): string {
  // Since this GraphQL endpoint doesn't support aggregates, we'll fetch all records and count them
  const countQueries = entities
    .map(
      entity =>
        `    ${entity.name} {
      id
    }`,
    )
    .join("\n");

  return `query GetEventCounts {
${countQueries}
  }`;
}

export function generateRecentEventsQuery(entities: EntityInfo[], limit: number = 10): string {
  const eventQueries = entities
    .map(entity => {
      const fields = entity.fields.map(field => `      ${field.name}`).join("\n");
      return `    ${entity.name}(limit: ${limit}, order_by: { id: desc }) {
${fields}
    }`;
    })
    .join("\n");

  return `query GetRecentEvents {
${eventQueries}
  }`;
}

export async function queryGraphQL<T>(query: string, variables?: Record<string, any>): Promise<GraphQLResponse<T>> {
  try {
    const response = await fetch(ENVIO_GRAPHQL_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      const message = `GraphQL request failed: ${response.status} ${response.statusText} (url: ${ENVIO_GRAPHQL_URL})`;
      console.error(message);
      throw new Error(message);
    }

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(", ")}`);
    }

    return result;
  } catch (error) {
    // Provide more context for network-level failures so developers can quickly see if the envio/GraphQL
    // service is unreachable (e.g. not running locally at http://localhost:8080)
    if (error instanceof Error && /failed to fetch/i.test(error.message)) {
      console.error(
        `GraphQL network error when contacting ${ENVIO_GRAPHQL_URL}. Is the envio service running? Original error:`,
        error,
      );
    } else {
      console.error("GraphQL query error:", error);
    }

    // Re-throw so callers who expect a rejection still receive it. Callers may also be defensive and
    // handle empty results (several callers in the app already do).
    throw error;
  }
}

// Fetch schema and generate dynamic queries
export async function getSchemaEntities(): Promise<EntityInfo[]> {
  // Always use the static schema.graphql file since it only contains the entities we want
  return getStaticSchemaEntities();
}

// Fallback: read schema from file
async function getStaticSchemaEntities(): Promise<EntityInfo[]> {
  try {
    const response = await fetch("/api/envio/schema");
    if (!response.ok) {
      console.error(`Failed to fetch static schema: ${response.status} ${response.statusText} (url: /api/envio/schema)`);
      return [];
    }
    const schemaContent = await response.text();
    return parseSchemaEntities(schemaContent);
  } catch (error) {
    console.error("Failed to fetch static schema:", error, "(url: /api/envio/schema)");
    return [];
  }
}

export async function getEventCounts() {
  const entities = await getSchemaEntities();
  if (entities.length === 0) {
    console.warn("No entities found in schema");
    return {};
  }

  const query = generateEventCountsQuery(entities);
  const result = await queryGraphQL<Record<string, any[]>>(query);

  // Count the results for each entity
  const counts: Record<string, number> = {};
  entities.forEach(entity => {
    const data = result.data[entity.name];
    counts[entity.name] = Array.isArray(data) ? data.length : 0;
  });

  return counts;
}

export async function getRecentEvents(limit: number = 10) {
  const entities = await getSchemaEntities();
  if (entities.length === 0) {
    console.warn("No entities found in schema");
    return {};
  }

  const query = generateRecentEventsQuery(entities, limit);
  const result = await queryGraphQL<Record<string, any[]>>(query);
  return result.data;
}

// Fetch the FactoryContract MarketplaceDeployed entities specifically
export async function getMarketplaceDeployments() {
  const query = `query GetMarketplaceDeployments {
    FactoryContract_MarketplaceDeployed(order_by: { id: desc }) {
      id
      marketplace
      creator
    }
  }`;

  try {
    const result = await queryGraphQL<{ FactoryContract_MarketplaceDeployed: Array<{ id: string; marketplace: string; creator: string }> }>(query);
    return result.data.FactoryContract_MarketplaceDeployed || [];
  } catch (error) {
    console.error("Failed to fetch marketplace deployments from Envio/Hasura:", error);
    return [];
  }
}
