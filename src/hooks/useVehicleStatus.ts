import { useState, useEffect, useCallback } from "react";
import { format, isWithinInterval, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type ComputedStatus = "available" | "rented" | "maintenance" | "repair";

interface RentalBooking {
  id: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface MaintenanceBlock {
  id: string;
  start_date: string;
  end_date: string;
}

interface UseVehicleStatusResult {
  computedStatus: ComputedStatus;
  isLoading: boolean;
  bookings: RentalBooking[];
  maintenanceBlocks: MaintenanceBlock[];
  refetch: () => void;
}

/**
 * Computes the vehicle's current status based on:
 * 1. Active bookings (today within booking period → "rented")
 * 2. Maintenance blocks (today within maintenance period → "maintenance")
 * 3. Base status from vehicle record (needs_repair → "repair")
 * 4. Otherwise → "available"
 * 
 * This is the SINGLE source of truth for vehicle status.
 */
export function useVehicleStatus(
  vehicleId: string | undefined,
  baseStatus?: string
): UseVehicleStatusResult {
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [maintenanceBlocks, setMaintenanceBlocks] = useState<MaintenanceBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchData = useCallback(async () => {
    if (!vehicleId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Fetch active bookings and maintenance blocks in parallel
      const [bookingsResult, maintenanceResult] = await Promise.all([
        supabase
          .from("rental_bookings")
          .select("id, start_date, end_date, status")
          .eq("vehicle_id", vehicleId)
          .in("status", ["confirmed", "active"]),
        supabase
          .from("maintenance_blocks")
          .select("id, start_date, end_date")
          .eq("vehicle_id", vehicleId),
      ]);

      if (bookingsResult.error) {
        console.error("Error fetching bookings:", bookingsResult.error);
      } else {
        setBookings(bookingsResult.data || []);
      }

      if (maintenanceResult.error) {
        console.error("Error fetching maintenance blocks:", maintenanceResult.error);
      } else {
        setMaintenanceBlocks(maintenanceResult.data || []);
      }
    } catch (error) {
      console.error("Error in useVehicleStatus:", error);
    } finally {
      setIsLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Compute status based on today's date
  const computedStatus = computeStatusForDate(
    new Date(),
    bookings,
    maintenanceBlocks,
    baseStatus
  );

  return {
    computedStatus,
    isLoading,
    bookings,
    maintenanceBlocks,
    refetch,
  };
}

/**
 * Computes status for a specific date.
 * Priority:
 * 1. If date is within a booking → "rented"
 * 2. If date is within a maintenance block → "maintenance"
 * 3. If base_status is "repair" → "repair"
 * 4. Otherwise → "available"
 */
export function computeStatusForDate(
  date: Date,
  bookings: RentalBooking[],
  maintenanceBlocks: MaintenanceBlock[],
  baseStatus?: string
): ComputedStatus {
  const dateStr = format(date, "yyyy-MM-dd");

  // Check if within any active booking
  for (const booking of bookings) {
    if (
      booking.status === "confirmed" ||
      booking.status === "active"
    ) {
      const start = parseISO(booking.start_date);
      const end = parseISO(booking.end_date);
      if (
        isWithinInterval(date, { start, end }) ||
        dateStr === booking.start_date ||
        dateStr === booking.end_date
      ) {
        return "rented";
      }
    }
  }

  // Check if within any maintenance block
  for (const block of maintenanceBlocks) {
    const start = parseISO(block.start_date);
    const end = parseISO(block.end_date);
    if (
      isWithinInterval(date, { start, end }) ||
      dateStr === block.start_date ||
      dateStr === block.end_date
    ) {
      return "maintenance";
    }
  }

  // Check base status for repair
  if (baseStatus === "repair") {
    return "repair";
  }

  return "available";
}

/**
 * Hook for computing statuses for multiple vehicles at once (fleet view)
 */
export function useFleetStatuses(
  vehicleIds: string[]
): {
  statuses: Map<string, ComputedStatus>;
  isLoading: boolean;
  refetch: () => void;
} {
  const [statuses, setStatuses] = useState<Map<string, ComputedStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (vehicleIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchAllStatuses = async () => {
      setIsLoading(true);
      try {
        // Fetch all bookings and maintenance blocks for all vehicles
        const [bookingsResult, maintenanceResult, vehiclesResult] = await Promise.all([
          supabase
            .from("rental_bookings")
            .select("id, vehicle_id, start_date, end_date, status")
            .in("vehicle_id", vehicleIds)
            .in("status", ["confirmed", "active"]),
          supabase
            .from("maintenance_blocks")
            .select("id, vehicle_id, start_date, end_date")
            .in("vehicle_id", vehicleIds),
          supabase
            .from("vehicles")
            .select("id, status")
            .in("id", vehicleIds),
        ]);

        const bookingsByVehicle = new Map<string, RentalBooking[]>();
        const maintenanceByVehicle = new Map<string, MaintenanceBlock[]>();
        const baseStatusByVehicle = new Map<string, string>();

        // Group bookings by vehicle
        (bookingsResult.data || []).forEach((b: any) => {
          const list = bookingsByVehicle.get(b.vehicle_id) || [];
          list.push(b);
          bookingsByVehicle.set(b.vehicle_id, list);
        });

        // Group maintenance blocks by vehicle
        (maintenanceResult.data || []).forEach((m: any) => {
          const list = maintenanceByVehicle.get(m.vehicle_id) || [];
          list.push(m);
          maintenanceByVehicle.set(m.vehicle_id, list);
        });

        // Get base status for each vehicle
        (vehiclesResult.data || []).forEach((v: any) => {
          baseStatusByVehicle.set(v.id, v.status);
        });

        // Compute status for each vehicle
        const newStatuses = new Map<string, ComputedStatus>();
        vehicleIds.forEach((id) => {
          const vehicleBookings = bookingsByVehicle.get(id) || [];
          const vehicleMaintenance = maintenanceByVehicle.get(id) || [];
          const baseStatus = baseStatusByVehicle.get(id);

          // Only use "repair" as base status - all others are computed
          const effectiveBaseStatus = baseStatus === "repair" ? "repair" : undefined;

          newStatuses.set(
            id,
            computeStatusForDate(new Date(), vehicleBookings, vehicleMaintenance, effectiveBaseStatus)
          );
        });

        setStatuses(newStatuses);
      } catch (error) {
        console.error("Error fetching fleet statuses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStatuses();
  }, [vehicleIds.join(","), refreshTrigger]);

  const refetch = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return { statuses, isLoading, refetch };
}
