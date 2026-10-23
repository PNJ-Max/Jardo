/** L'heure courante, injectée comme `TimeProvider` côté .NET : les tests la figent. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
