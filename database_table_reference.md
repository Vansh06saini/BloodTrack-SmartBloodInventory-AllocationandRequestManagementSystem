# Database Table Reference

A reference guide for the six CSV table exports in the system. Data types listed are inferred from exported values; verify against the production MySQL schema if exact SQL column definitions are needed.

---

## 1. `blood_donation`
Records which blood units are assigned to hospital requests and the timestamp of assignment.

| Column | Likely Data Type | Description |
| :--- | :--- | :--- |
| **`allocation_id`** | `INT` | Unique primary key for an allocation record. |
| **`request_id`** | `INT` | Foreign key referencing the associated hospital request. |
| **`unit_id`** | `INT` | Foreign key referencing the assigned blood unit. |
| **`allocated_at`** | `DATETIME` | Timestamp when the unit was allocated. |

---

## 2. `blood_unit`
Stores details about each collected blood unit, including group, expiry, batch tracking, and availability status.

| Column | Likely Data Type | Description |
| :--- | :--- | :--- |
| **`unit_id`** | `INT` | Unique primary key for each blood unit. |
| **`blood_group`** | `VARCHAR` | Blood type classification (e.g., `O+`, `AB-`). |
| **`collection_date`** | `DATE` | Date the blood was collected. |
| **`expiry_date`** | `DATE` | Expiration date after which the unit is unusable. |
| **`batch_number`** | `VARCHAR` | Connects a unit to its processing/collection batch. |
| **`status`** | `VARCHAR` | Current state of the unit (e.g., `AVAILABLE`, `RESERVED`). |
| **`created_at`** | `DATETIME` | Timestamp when the unit record was created. |
| **`unit_code`** | `VARCHAR` | Secondary unique identifier/code for tracking. |

---

## 3. `bloodallocation`
Records historical and current unit allocation events for hospital requests.

| Column | Likely Data Type | Description |
| :--- | :--- | :--- |
| **`allocation_id`** | `INT` | Unique primary key for an allocation record. |
| **`request_id`** | `INT` | Foreign key referencing the hospital request. |
| **`unit_id`** | `INT` | Foreign key referencing the assigned blood unit. |
| **`allocated_at`** | `DATETIME` | Timestamp when the allocation occurred. |

---

## 4. `hospitalrequest`
Stores blood requests submitted by hospitals, including quantity, urgency, and fulfillment state.

| Column | Likely Data Type | Description |
| :--- | :--- | :--- |
| **`request_id`** | `INT` | Unique primary key for each hospital request. |
| **`request_code`** | `VARCHAR` | Human-readable tracking code for reference. |
| **`hospital_id`** | `INT` | Foreign key identifying the requesting hospital/user account. |
| **`blood_group`** | `VARCHAR` | Required blood group requested. |
| **`quantity`** | `INT` | Total number of units requested. |
| **`priority`** | `VARCHAR` | Priority level (e.g., `ROUTINE`, `URGENT`, `EMERGENCY`). |
| **`required_date`** | `DATE` | Target fulfillment date. |
| **`reason`** | `TEXT` / `VARCHAR` | Clinical or operational reason for the request. |
| **`status`** | `VARCHAR` | Current request workflow state (e.g., `PENDING`, `ALLOCATED`). |
| **`created_at`** | `DATETIME` | Timestamp when the request was submitted. |
| **`updated_at`** | `DATETIME` | Timestamp of the most recent status modification. |

---

## 5. `stockmovement`
Maintains an audit trail for all inventory modifications (incoming stock, outgoing allocations, adjustments).

| Column | Likely Data Type | Description |
| :--- | :--- | :--- |
| **`movement_id`** | `INT` | Unique primary key for each stock movement entry. |
| **`unit_id`** | `INT` | Foreign key referencing the relevant blood unit. |
| **`movement_type`** | `VARCHAR` | Classification of movement (e.g., `INCOMING`, `OUTGOING`, `EXPIRED`). |
| **`reference_type`** | `VARCHAR` | Source category linked to the movement (e.g., `DONATION`, `REQUEST`). |
| **`reference_id`** | `INT` | Identifier of the associated source entity record. |
| **`quantity`** | `INT` | Number of units affected by this movement. |
| **`remarks`** | `TEXT` / `VARCHAR` | Explanatory notes regarding the movement. |
| **`created_at`** | `DATETIME` | Timestamp when the movement was logged. |

---

## 6. `users`
Contains account credentials, access roles, and contact information for system users.

| Column | Likely Data Type | Description |
| :--- | :--- | :--- |
| **`user_id`** | `INT` | Unique primary key for each user account. |
| **`name`** | `VARCHAR` | Full name of the user or hospital organization. |
| **`email`** | `VARCHAR` | Unique email address used for login and notifications. |
| **`contact`** | `VARCHAR` | Phone number or primary contact numeric string. |
| **`password`** | `VARCHAR` | Hashed account password (never store in plain text). |
| **`role`** | `ENUM` / `VARCHAR` | Authorization level (e.g., `ADMIN`, `HOSPITAL`, `STAFF`). |
| **`created_at`** | `DATETIME` | Timestamp when the account was registered. |