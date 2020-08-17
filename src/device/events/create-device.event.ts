import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Event } from './event';


class Device {
  @IsNotEmpty()
  @IsString()
  readonly flatId: string
}

export class CreateDeviceEvent extends Event {
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => Device)
  readonly data: Device;
}
