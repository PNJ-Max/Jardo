using Jardo.Api.Dtos;

namespace Jardo.Api.Services;

/// <summary>
/// Les tâches du jardin et leur échéance. Faire une tâche, c'est noter l'intervention au journal.
/// </summary>
public interface ITaskService
{
    /// <summary>
    /// Les tâches, les plus en retard d'abord. Sans cible, tout le jardin. Pour une cible, comme le
    /// journal : ses tâches, celles de ce qu'elle contient, et celles de la zone ou de l'espace qui
    /// la contient.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La cible n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">Plusieurs cibles sont données.</exception>
    Task<List<TaskResponseDto>> GetAllAsync(
        int? spaceId = null,
        int? zoneId = null,
        int? itemId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Les tâches dues de tout le jardin, toutes catégories, les plus en retard d'abord. Celles des
    /// éléments et des espaces archivés n'y figurent jamais.
    /// </summary>
    Task<List<TaskResponseDto>> GetDueAsync(DueHorizon horizon, CancellationToken cancellationToken = default);

    /// <exception cref="Infrastructure.NotFoundException">La tâche n'existe pas.</exception>
    Task<TaskResponseDto> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <exception cref="Infrastructure.BusinessRuleException">
    /// Cible incohérente, archivée ou qui n'accueille pas ce type ; intervalle absent ou superflu ;
    /// titre absent pour une tâche « autre ».
    /// </exception>
    Task<TaskResponseDto> CreateAsync(SaveTaskDto dto, CancellationToken cancellationToken = default);

    /// <summary>Modifie une tâche, cible et rythme compris.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La tâche n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">Mêmes règles qu'à la création.</exception>
    Task<TaskResponseDto> UpdateAsync(int id, SaveTaskDto dto, CancellationToken cancellationToken = default);

    /// <summary>Supprime une tâche ; le journal n'est pas touché.</summary>
    /// <exception cref="Infrastructure.NotFoundException">La tâche n'existe pas.</exception>
    Task DeleteAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// « Fait » : note l'intervention au journal, sur la cible de la tâche, et renvoie la tâche
    /// recalculée avec l'entrée notée. Une tâche ponctuelle est close dès que c'est fait, même avant
    /// sa date.
    /// </summary>
    /// <exception cref="Infrastructure.NotFoundException">La tâche n'existe pas.</exception>
    /// <exception cref="Infrastructure.BusinessRuleException">
    /// Date future, cible archivée, ou entrée refusée par le journal (une observation sans note).
    /// </exception>
    Task<TaskCompletionResponseDto> CompleteAsync(int id, CompleteTaskDto dto, CancellationToken cancellationToken = default);
}
