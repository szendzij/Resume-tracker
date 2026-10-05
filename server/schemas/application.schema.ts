import { z } from 'zod';

export const timelineEntrySchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
  note: z.string().optional(),
});

export const createApplicationSchema = z.object({
  id: z.string().optional(),
  role: z
    .string({
      message: 'Pole role jest wymagane i musi być ciągiem znaków',
    })
    .trim()
    .min(1, 'Pole role jest wymagane'),
  company: z
    .string({
      message: 'Pole company jest wymagane i musi być ciągiem znaków',
    })
    .trim()
    .min(1, 'Pole company jest wymagane'),
  portal: z.string().optional(),
  url: z.string().optional(),
  appliedDate: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  timeline: z.array(timelineEntrySchema).optional(),
  notes: z.string().optional(),
  lastUpdated: z.string().optional(),
});

export const updateApplicationSchema = z.object({
  id: z.string().optional(),
  role: z.string().trim().min(1, 'Pole role nie może być puste').optional(),
  company: z.string().trim().min(1, 'Pole company nie może być puste').optional(),
  portal: z.string().optional(),
  url: z.string().optional(),
  appliedDate: z.string().optional(),
  status: z.string().optional(),
  location: z.string().optional(),
  salary: z.string().optional(),
  skills: z.array(z.string()).optional(),
  timeline: z.array(timelineEntrySchema).optional(),
  notes: z.string().optional(),
  lastUpdated: z.string().optional(),
});

export const batchApplicationsSchema = z.object({
  applications: z.array(createApplicationSchema, {
    message: 'Tablica applications jest wymagana',
  }),
});

export const bulkDeleteApplicationsSchema = z.object({
  ids: z.array(z.string(), {
    message: 'Tablica ids jest wymagana',
  }),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
export type BatchApplicationsInput = z.infer<typeof batchApplicationsSchema>;
export type BulkDeleteApplicationsInput = z.infer<typeof bulkDeleteApplicationsSchema>;
