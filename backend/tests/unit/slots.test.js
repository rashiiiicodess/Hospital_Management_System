import { computeOpenSlots } from '../../src/services/slots.service.js';
import { DateTime } from 'luxon';
import { TIMEZONE } from '../../src/lib/time.js';

describe('Slot Generation Logic', () => {
  // Use a future date so past-slot filtering doesn't exclude them
  const futureDateStr = DateTime.now().setZone(TIMEZONE).plus({ days: 3 }).toFormat('yyyy-MM-dd');

  test('generates exact 20-minute slots and drops trailing partial window', () => {
    // Window is 09:00 to 09:50 (50 mins) -> Should give two 20-min slots (09:00-09:20, 09:20-09:40), dropping trailing 10 mins
    const slots = computeOpenSlots({
      dateStr: futureDateStr,
      workingWindows: [{ start_time: '09:00', end_time: '09:50' }],
      bookedAppointments: [],
    });

    expect(slots).toHaveLength(2);
    expect(slots[0].startTime).toContain('09:00:00');
    expect(slots[0].endTime).toContain('09:20:00');
    expect(slots[1].startTime).toContain('09:20:00');
    expect(slots[1].endTime).toContain('09:40:00');
  });

  test('excludes slots that conflict with booked appointments', () => {
    const windowStart = `${futureDateStr}T10:00:00.000+05:30`;
    const windowEnd = `${futureDateStr}T10:20:00.000+05:30`;

    const slots = computeOpenSlots({
      dateStr: futureDateStr,
      workingWindows: [{ start_time: '10:00', end_time: '11:00' }], // 3 slots: 10:00, 10:20, 10:40
      bookedAppointments: [
        {
          start_time: windowStart,
          end_time: windowEnd,
        },
      ],
    });

    // 10:00 - 10:20 slot is booked, so only 10:20 and 10:40 remain
    expect(slots).toHaveLength(2);
    expect(slots[0].startTime).toContain('10:20:00');
    expect(slots[1].startTime).toContain('10:40:00');
  });

  test('returns empty array for dates in the past', () => {
    const pastDateStr = '2020-01-01';
    const slots = computeOpenSlots({
      dateStr: pastDateStr,
      workingWindows: [{ start_time: '09:00', end_time: '12:00' }],
      bookedAppointments: [],
    });

    expect(slots).toEqual([]);
  });
});

