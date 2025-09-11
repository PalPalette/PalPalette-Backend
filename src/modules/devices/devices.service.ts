import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import { Device } from "./entities/device.entity";
import { User } from "../users/entities/user.entity";
import { UpdateDeviceDto } from "./dto/device-management/update-device.dto";

@Injectable()
export class DevicesService {
  constructor(
    @InjectRepository(Device)
    private readonly deviceRepository: Repository<Device>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) {}

  // KEEP THESE METHODS - Still needed for general device management
  async findUserDevices(userId: string): Promise<Device[]> {
    return this.deviceRepository.find({
      where: { user: { id: userId } },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  async findAll(): Promise<Device[]> {
    return this.deviceRepository.find({ relations: ["user", "messages"] });
  }

  async findOne(id: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { id },
      relations: ["user", "messages"],
    });

    if (!device) {
      throw new NotFoundException("Device not found");
    }

    return device;
  }

  async findByMacAddress(macAddress: string): Promise<Device> {
    const device = await this.deviceRepository.findOne({
      where: { macAddress },
      relations: ["user", "messages"],
    });

    if (!device) {
      throw new NotFoundException(
        `Device with MAC address ${macAddress} not found`
      );
    }

    return device;
  }

  async findUnpairedDevices(): Promise<Device[]> {
    console.log("🔍 DevicesService: Searching for unpaired devices...");
    const devices = await this.deviceRepository.find({
      where: { user: IsNull() },
      order: { lastSeenAt: "DESC" },
    });
    console.log(
      `🔍 DevicesService: Found ${devices.length} devices with user=null`
    );

    // Log each device for debugging
    devices.forEach((device) => {
      console.log(
        `📱 Device: ${device.name} (${device.macAddress}) - User: ${
          device.user ? "PAIRED" : "UNPAIRED"
        }, LastSeen: ${device.lastSeenAt}`
      );
    });

    return devices;
  }

  async update(id: string, updateDeviceDto: UpdateDeviceDto): Promise<Device> {
    const device = await this.findOne(id);
    Object.assign(device, updateDeviceDto);
    return this.deviceRepository.save(device);
  }

  async remove(id: string): Promise<void> {
    const device = await this.findOne(id);
    await this.deviceRepository.remove(device);
  }
}
