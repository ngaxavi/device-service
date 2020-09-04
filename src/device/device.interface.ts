export interface RoomMeasurement {
  roomNr: number;
  temperature: {
    timestamp: Date;
    value: number;
  };
  meterValue: {
    timestamp: Date;
    value: number;
  };
}

export interface MeasurementValue {
  timestamp: Date;
  temperature: number;
  meterValue: number;
}

export interface QueryOptions {
  user?: {
    name?: string;
    roles?: string[];
    resourceRoles?: string[];
  };
}

export interface RoomMinMaxMeterValue {
  roomNr: number;
  minMeterValue: number;
  maxMeterValue: number;
}
