/**
 * The two-column story has one deliberate minimum size.
 *
 * Portrait / desktop use 960×640. Landscape phones and small tablets are a
 * special case: an 844×390 phone is a legitimate two-column spread even though
 * it is far below 960px wide, so the shell switches on orientation instead of
 * width alone. The landscape minimum is 640×360; below that width the mobile
 * stepper takes over.
 */
export const TWO_COLUMN_MIN_WIDTH = 960;
export const TWO_COLUMN_MIN_HEIGHT = 640;
export const LANDSCAPE_MIN_WIDTH = 640;
export const LANDSCAPE_MIN_HEIGHT = 360;
export const TWO_COLUMN_QUERY = `(min-width: ${TWO_COLUMN_MIN_WIDTH}px), (orientation: landscape) and (min-width: ${LANDSCAPE_MIN_WIDTH}px)`;
export const TWO_COLUMN_MAX_WIDTH = 1600;
export const TWO_COLUMN_MAX_HEIGHT = 920;
export const MOBILE_QUERY = `(max-width: ${TWO_COLUMN_MIN_WIDTH - 1}px)`;
