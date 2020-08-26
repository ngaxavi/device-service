import { IsString, IsOptional } from 'class-validator';

export class UpdateDeviceDto {
  @IsString()
  @IsOptional()
  deviceId: string;

  @IsString()
  @IsOptional()
  name: string;
}
