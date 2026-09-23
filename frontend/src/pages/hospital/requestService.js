const STORAGE_KEY = "bloodtrack_requests";

const SEED_REQUESTS = [
  {
    id: "REQ-1001",
    bloodGroup: "O+",
    quantity: 3,
    priority: "Emergency",
    requiredDate: "2026-09-22",
    date: "20 Sep 2026",
    createdDate: "2026-09-20",
    status: "Allocated",
    hospital: "City Care Hospital",
    allocation: {
      allocatedUnits: 3,
      bloodBank: "Central Blood Bank",
      allocationDate: "2026-09-21",
      method: "FEFO",
    },
  },
  {
    id: "REQ-1002",
    bloodGroup: "A+",
    quantity: 2,
    priority: "Urgent",
    requiredDate: "2026-09-23",
    date: "20 Sep 2026",
    createdDate: "2026-09-20",
    status: "Waiting",
    hospital: "City Care Hospital",
  },
  {
    id: "REQ-1003",
    bloodGroup: "B+",
    quantity: 4,
    priority: "Routine",
    requiredDate: "2026-09-25",
    date: "19 Sep 2026",
    createdDate: "2026-09-19",
    status: "Completed",
    hospital: "City Care Hospital",
    allocation: {
      allocatedUnits: 4,
      bloodBank: "Metro Blood Center",
      allocationDate: "2026-09-19",
      method: "FIFO",
    },
  },
  {
    id: "REQ-1004",
    bloodGroup: "O-",
    quantity: 2,
    priority: "Emergency",
    requiredDate: "2026-09-22",
    date: "19 Sep 2026",
    createdDate: "2026-09-19",
    status: "Waiting",
    hospital: "City Care Hospital",
  },
];

export function getRequests() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REQUESTS));
      return SEED_REQUESTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_REQUESTS;
  } catch (error) {
    console.error("Failed to read requests from storage:", error);
    return SEED_REQUESTS;
  }
}

export function getRequestById(id) {
  const requests = getRequests();
  return requests.find((req) => req.id === id) || null;
}

export function createRequest(formData) {
  const requests = getRequests();

  // Find max numeric ID suffix
  let maxId = 1000;
  requests.forEach((req) => {
    const numPart = parseInt(req.id?.replace(/\D/g, ""), 10);
    if (!isNaN(numPart) && numPart > maxId) {
      maxId = numPart;
    }
  });

  const now = new Date();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const formattedDate = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  const isoDate = now.toISOString().split("T")[0];

  const newRequest = {
    id: `REQ-${maxId + 1}`,
    bloodGroup: formData.bloodGroup,
    quantity: Number(formData.quantity),
    priority: formData.priority,
    requiredDate: formData.requiredDate,
    date: formattedDate,
    createdDate: isoDate,
    status: "Waiting",
    hospital: formData.hospital || "City Care Hospital",
  };

  const updatedRequests = [newRequest, ...requests];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));
  } catch (error) {
    console.error("Failed to save new request to storage:", error);
  }

  return newRequest;
}

export function getStatistics() {
  const requests = getRequests();
  return {
    total: requests.length,
    waiting: requests.filter((r) => r.status === "Waiting").length,
    allocated: requests.filter((r) => r.status === "Allocated").length,
    emergency: requests.filter((r) => r.priority === "Emergency").length,
    completed: requests.filter((r) => r.status === "Completed").length,
  };
}