import { Router } from "express";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const router = Router();

async function fetchLocationData(query) {
  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: query,
          format: "json",
          limit: 1,
        },
      }
    );
    if (response.data.length > 0) {
      return response.data[0];
    } else {
      throw new Error("No data found");
    }
  } catch (error) {
    console.error("Error fetching location data:", error);
    throw error;
  }
}

router.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    const locationData = await fetchLocationData(query);
    res.json(locationData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/addLocation", async (req, res) => {
  const { country, city, zone, crimeTime, typeCrime } = req.body;
  try {
    if (!country) {
      throw new Error("Country is required");
    }

    const countryData = await fetchLocationData(country);
    const countryDocument = {
      country: countryData.display_name,
      gis: {
        type: "Point",
        coordinates: [parseFloat(countryData.lon), parseFloat(countryData.lat)],
      },
      boundingbox: countryData.boundingbox,
      place_id: parseInt(countryData.place_id),
    };

    const countryDoc = await prisma.countryCrimes.upsert({
      where: { country: countryData.display_name },
      update: countryDocument,
      create: countryDocument,
    });

    if (!city) {
      throw new Error("City is required");
    }

    const cityData = await fetchLocationData(`${country} + ${city}`);
    const cityDocument = {
      city: cityData.display_name,
      gis: {
        type: "Point",
        coordinates: [parseFloat(cityData.lon), parseFloat(cityData.lat)],
      },
      boundingbox: cityData.boundingbox,
      countryId: countryDoc.id,
      place_id: parseInt(cityData.place_id),
    };

    const cityDoc = await prisma.cityCrimes.upsert({
      where: { city: cityData.display_name },
      update: cityDocument,
      create: cityDocument,
    });

    if (!zone) {
      throw new Error("Zone is required");
    }

    const zoneData = await fetchLocationData(`${country} + ${city}+  ${zone}`);
    console.log("Zone Data:", zoneData);
    const zoneDocument = {
      zone: zoneData.display_name,
      gis: {
        type: "Point",
        coordinates: [parseFloat(zoneData.lon), parseFloat(zoneData.lat)],
      },
      boundingbox: zoneData.boundingbox,
      cityId: cityDoc.id,
      place_id: parseInt(zoneData.place_id),
    };

    const zoneDoc = await prisma.zone.upsert({
      where: { zone: zoneData.display_name },
      update: zoneDocument,
      create: zoneDocument,
    });

    const locationDocument = {
      crimeTime: new Date(crimeTime),
      typeCrime: typeCrime,
      zoneId: zoneDoc.id,
    };

    const locationDoc = await prisma.location.create({
      data: locationDocument,
    });

    console.log("Country Document after update:", countryDoc);
    console.log("City Document after update:", cityDoc);
    console.log("Zone Document after update:", zoneDoc);
    console.log("Location Document after update:", locationDoc);
    res.json({
      country: countryDoc,
      city: cityDoc,
      zone: zoneDoc,
      location: locationDoc,
    });
  } catch (error) {
    console.error("Error adding or updating location:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/getLocation", async (req, res) => {
  const { country, city, zone } = req.query;
  try {
    let result = {};

    if (country) {
      const countryDoc = await prisma.countryCrimes.findUnique({
        where: { country },
        include: {
          cities: {
            include: {
              zones: {
                include: {
                  locations: true,
                },
              },
            },
          },
        },
      });
      result.country = countryDoc;
      if (city) {
        const cityDoc = countryDoc.cities.find((c) => c.city === city);
        if (cityDoc) {
          result.city = cityDoc;
          if (zone) {
            const zoneDoc = cityDoc.zones.find((z) => z.zone === zone);
            if (zoneDoc) {
              result.zone = zoneDoc;
            }
          }
        }
      }
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching location data:", error);
    res.status(500).json({ error: error.message });
  }
});

(async () => {
  try {
    await prisma.$connect();
    console.log("Connected to the database");
  } catch (error) {
    console.error("Failed to connect to the database:", error);
  }
})();

router.get("/awake", (req, res) => {
  res.json({
    message: "awakking",
  });
});

export default router;
