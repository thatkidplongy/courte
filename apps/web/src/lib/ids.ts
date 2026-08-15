import { idSchema } from '@courte/contract';

/**
 * A dynamic segment is whatever the reader put in the address bar, so `/courts/abc` is a
 * request this app has to answer rather than a case it can assume away.
 *
 * Returns null instead of throwing, because the answer at a page boundary is `notFound()` —
 * a 404 is the truthful response to a URL that cannot name a court. Parsing here also keeps
 * the failure local: without it a non-numeric id would travel to the API and come back as a
 * 400 rendered as an error page, which is a worse answer to the same question.
 *
 * Same schema the API validates with, so the two sides cannot disagree about what an id is.
 */
export const parseRouteId = (value: string): number | null => {
  const result = idSchema.safeParse(value);
  return result.success ? result.data : null;
};

/**
 * The same job for a form field. Every value in a FormData is a string, so a court id posted
 * by a hidden input or a select needs the same parse a URL segment does.
 *
 * Returns null rather than throwing: a server action answers with a message the form renders,
 * and a 500 for a tampered hidden field is a worse answer than a sentence.
 */
export const readFormId = (formData: FormData, field: string): number | null => {
  const result = idSchema.safeParse(formData.get(field));
  return result.success ? result.data : null;
};
