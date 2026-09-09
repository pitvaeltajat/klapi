import { NextResponse } from 'next/server';
import { computeAvailabilities } from '@/utils/availability';

export async function POST(request: Request) {
  const { StartDate, EndDate } = await request.json();

  // Add validation for dates
  if (!StartDate || !EndDate) {
    return NextResponse.json({
      error: 'Missing required dates',
      details: {
        StartDate: StartDate ? 'present' : 'missing',
        EndDate: EndDate ? 'present' : 'missing',
      },
    }, { status: 400 });
  }

  // Validate that the dates are valid
  const startDate = new Date(StartDate);
  const endDate = new Date(EndDate);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({
      error: 'Invalid date format',
      details: {
        StartDate: isNaN(startDate.getTime()) ? 'invalid' : 'valid',
        EndDate: isNaN(endDate.getTime()) ? 'invalid' : 'valid',
      },
    }, { status: 400 });
  }

  // Validate that end date is after start date
  if (endDate < startDate) {
    return NextResponse.json({
      error: 'End date must be after start date',
      dates: {
        StartDate,
        EndDate,
      },
    }, { status: 400 });
  }

  // The sums (and the box-holds-its-contents rule) live in utils/availability.
  const availabilities = await computeAvailabilities({ start: startDate, end: endDate });

  return NextResponse.json({ availabilities });
}
