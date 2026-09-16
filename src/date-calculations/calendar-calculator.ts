/*
 * Class added in the hopes of being able to skip year zero.
 *
 * Step 1: The Calendar Math LogicWhen noYearZero: true is enabled in a calendar specification, there is no year 0.
 *  The timeline jumps directly from year -1 (BC/BCE) to year 1 (AD/CE).
 * To translate between absolute days ($D$) and calendrical years ($Y$):
 *
 * Calculated Year $\to$ Displayed Year:
 *
 * $$\text{Displayed Year} = \begin{cases} Y & \text{if } Y > 0 \text{ or } \text{noYearZero is } \mathbf{false} \\ Y - 1 & \text{if } Y \le 0 \text{ and } \text{noYearZero is } \mathbf{true} \end{cases}$$
 *
 * Displayed Year $\to$ Internal Calculated Year:
 *
 * $$\text{Internal Year} = \begin{cases} Y_{\text{disp}} & \text{if } Y_{\text{disp}} > 0 \text{ or } \text{noYearZero is } \mathbf{false} \\ Y_{\text{disp}} + 1 & \text{if } Y_{\text{disp}} < 0 \text{ and } \text{noYearZero is } \mathbf{true} \end{cases}$$
 */

// export interface CalendarRuleDetails {
//   daysInStandardYear: number;
//   noYearZero?: boolean; // New YAML property TODO
//   leapYearRule?: {
//     ruleType: 'none' | 'gregorian' | 'interval';
//     intervalYears?: number;
//     extraDays?: number;
//     applyToMonthIndex?: number;
//   };
//   months?: Array<{ name?: string; shortname?: string; days: number }>;
//   format?: string[];
//   outputFormat?: string[];
// }
//
// export interface CalendarConfig {
//   id: string;
//   type: 'leapYearRule-based' | 'positional';
//   offsetToDayZero: number;
//   delimiter: string;
//   bcSuffix?: string;
//   adSuffix?: string;
//   sharedOffset?: number | { year: number };
//   ruleBasedDetails?: CalendarRuleDetails;
//   positionalUnits?: Array<{ name: string; days: number }>;
// }


//
// Step 4: Updating YAML Calendar Specification
// Users can now enable noYearZero: true in their frontmatter/YAML calendar definitions:
//
//   YAML
// gantt-calendar-definition: fantasy
// type: leapYearRule-based
// offsetToDayZero: 0
// delimiter: '-'
// bcSuffix: 'BC'
// adSuffix: 'AD'
// ruleBasedDetails:
//   noYearZero: true
// daysInStandardYear: 365
// months:
//   - name: 'January'
// days: 31
// - name: 'February'
// days: 28
