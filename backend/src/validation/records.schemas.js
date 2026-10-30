import { z } from 'zod';

export const vitalsSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(), // appointmentId
  }),
  body: z.preprocess(
    (val) => {
      if (typeof val !== 'object' || val === null) return val;
      return {
        bloodPressureSystolic: val.bloodPressureSystolic ?? val.blood_pressure_systolic,
        bloodPressureDiastolic: val.bloodPressureDiastolic ?? val.blood_pressure_diastolic,
        pulseRate: val.pulseRate ?? val.pulse_rate ?? val.heart_rate,
        temperatureCelsius: val.temperatureCelsius ?? val.temperature_celsius,
        spo2Percentage: val.spo2Percentage ?? val.spo2_percentage ?? val.oxygen_saturation,
        weightKg: val.weightKg ?? val.weight_kg,
        heightCm: val.heightCm ?? val.height_cm,
      };
    },
    z.object({
      bloodPressureSystolic: z.number().int().min(50).max(300).optional(),
      bloodPressureDiastolic: z.number().int().min(30).max(200).optional(),
      pulseRate: z.number().int().min(20).max(300).optional(),
      temperatureCelsius: z.number().min(30).max(45).optional(),
      spo2Percentage: z.number().int().min(50).max(100).optional(),
      weightKg: z.number().positive().max(500).optional(),
      heightCm: z.number().positive().max(300).optional(),
    })
  ),
});

export const medicalRecordSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(), // appointmentId
  }),
  body: z.preprocess(
    (val) => {
      if (typeof val !== 'object' || val === null) return val;
      return {
        chiefComplaint: val.chiefComplaint ?? val.chief_complaint,
        diagnosis: val.diagnosis,
        clinicalNotes: val.clinicalNotes ?? val.clinical_notes ?? val.notes,
        followUpDate: val.followUpDate ?? val.follow_up_date,
      };
    },
    z.object({
      chiefComplaint: z.string().min(2, 'Chief complaint is required'),
      diagnosis: z.string().optional(),
      clinicalNotes: z.string().optional(),
      followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
    })
  ),
});