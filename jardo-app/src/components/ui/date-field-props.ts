// Contrat commun aux deux implémentations du sélecteur de date : date-field.tsx (Android)
// et date-field.web.tsx (navigateur). Metro choisit le fichier selon la plateforme.

type Common = {
  label: string;
  /** Interdit les jours après aujourd'hui (une intervention ne se note pas dans le futur). */
  noFuture?: boolean;
  /** Le premier jour accepté, "YYYY-MM-DD" : une tâche ponctuelle ne se fait pas avant son ouverture. */
  notBefore?: string;
  error?: string;
  hint?: string;
};

export type DateFieldProps = Common &
  (
    | { optional?: false; value: string; onChange: (value: string) => void }
    | { optional: true; value: string | null; onChange: (value: string | null) => void }
  );
