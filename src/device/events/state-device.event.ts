import { IsBoolean, IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Event } from './event';

class Device {
  @IsNotEmpty()
  @IsString()
  readonly flatId: string;

  @IsNotEmpty()
  @IsBoolean()
  readonly pull: boolean;
}

export class StateDeviceEvent extends Event {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Device)
  readonly data: Device;
}
