// export type LabelBounds = { x1: number, x2: number }
//
// /**
//  * Tracks rendered label positions per horizontal timeline row to prevent overlap.
//  */
// export class LabelOccupancyTracker {
//   private occupiedRanges: LabelBounds[] = []
//
//   /** Reset bounds before each full chart redrawing */
//   public clear(): void {
//     this.occupiedRanges = []
//   }
//
//   /**
//    * Checks if a label fits without overlapping existing labels.
//    * If it fits, registers its bounds and returns true.
//    */
//   public tryRegisterLabel(x: number, width: number, padding = 10): boolean {
//     const x1 = x - padding
//     const x2 = x + width + padding
//
//     for (const range of this.occupiedRanges) {
//       if (x1 < range.x2 && x2 > range.x1) {
//         return false // Overlap detected!
//       }
//     }
//
//     this.occupiedRanges.push({x1, x2})
//     return true
//   }
// }
