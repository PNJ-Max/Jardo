namespace Jardo.Api.Models;

/// <summary>
/// Le type d'un élément suivi, renvoyé avec les entrées du journal et les tâches qui le visent :
/// le front y lit quelle fiche ouvrir.
/// </summary>
public enum ItemKind
{
    Plant = 0,
    WoodPile = 1
}
