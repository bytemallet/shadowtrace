# Installation
> `npm install --save @types/suncalc`

# Summary
This package contains type definitions for suncalc (https://github.com/mourner/suncalc).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/suncalc.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/suncalc/index.d.ts)
````ts
export interface GetTimesResult {
    dawn: Date;
    dusk: Date;
    goldenHour: Date;
    goldenHourEnd: Date;
    nadir: Date;
    nauticalDawn: Date;
    nauticalDusk: Date;
    night: Date;
    nightEnd: Date;
    solarNoon: Date;
    sunrise: Date;
    sunriseEnd: Date;
    sunset: Date;
    sunsetStart: Date;
}
export interface GetSunPositionResult {
    altitude: number;
    azimuth: number;
}
export interface GetMoonPositionResult {
    altitude: number;
    azimuth: number;
    distance: number;
    parallacticAngle: number;
}
export interface GetMoonIlluminationResult {
    fraction: number;
    phase: number;
    angle: number;
}
export interface GetMoonTimes {
    rise: Date;
    set: Date;
    alwaysUp?: true;
    alwaysDown?: true;
}

export function getTimes(date: Date, latitude: number, longitude: number, height?: number): GetTimesResult;
export function addTime(angleInDegrees: number, morningName: string, eveningName: string): void;
export function getPosition(timeAndDate: Date, latitude: number, longitude: number): GetSunPositionResult;
export function getMoonPosition(timeAndDate: Date, latitude: number, longitude: number): GetMoonPositionResult;
export function getMoonIllumination(timeAndDate: Date): GetMoonIlluminationResult;
export function getMoonTimes(date: Date, latitude: number, longitude: number, inUTC?: boolean): GetMoonTimes;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 15:11:36 GMT
 * Dependencies: none

# Credits
These definitions were written by [horiuchi](https://github.com/horiuchi).
