// Les deux refus que lèvent les services, à passer à `rejects.toMatchObject`.

/** `BusinessRuleException` : 400, « Opération refusée ». */
export const refused = { status: 400, problem: { status: 400, title: 'Opération refusée' } };

/** `NotFoundException` : 404, « Ressource introuvable ». */
export const missing = { status: 404, problem: { status: 404, title: 'Ressource introuvable' } };
