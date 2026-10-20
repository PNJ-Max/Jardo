using Microsoft.OpenApi;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace Jardo.Api.Infrastructure;

/// <summary>
/// Une réponse de l'API sérialise toujours toutes ses propriétés, null compris. Sans ce filtre, le
/// contrat les déclare toutes facultatives, et les types générés pour le front aussi.
/// </summary>
public sealed class ResponsePropertiesRequiredFilter : ISchemaFilter
{
    public void Apply(IOpenApiSchema schema, SchemaFilterContext context)
    {
        if (context.Type.Name.EndsWith("ResponseDto", StringComparison.Ordinal)
            && schema is OpenApiSchema { Properties: { Count: > 0 } properties } responseSchema)
        {
            responseSchema.Required = new HashSet<string>(properties.Keys);
        }
    }
}
