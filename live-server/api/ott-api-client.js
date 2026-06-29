(function () {
  const config = window.OTT_CONFIG || {};
  const API_BASE_URL = (config.API_BASE_URL || 'https://ott-master-backend.onrender.com').replace(/\/$/, '');

  function getAccessToken() {
    return sessionStorage.getItem('ott_access_token') || '';
  }

  function setAccessToken(token) {
    if (token) sessionStorage.setItem('ott_access_token', token);
  }

  function clearAccessToken() {
    sessionStorage.removeItem('ott_access_token');
  }

  function buildQuery(params = {}) {
    const clean = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      clean.set(key, String(value));
    });
    const query = clean.toString();
    return query ? `?${query}` : '';
  }



  function compactObject(source = {}) {
    const clean = {};
    Object.entries(source).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return;
        clean[key] = trimmed;
        return;
      }
      clean[key] = value;
    });
    return clean;
  }

  function assertNoAdminDbColumns(body, label) {
    const duplicateContactPhoneKey = 'contact_' + 'contact_phone';
    const duplicateContactPhoneCamelKey = 'contact' + 'ContactPhone';
    const forbiddenKeys = [
      'contact_phone',
      'contactPhone',
      duplicateContactPhoneKey,
      duplicateContactPhoneCamelKey,
      'metadata'
    ];
    const found = forbiddenKeys.filter((key) => Object.prototype.hasOwnProperty.call(body || {}, key));
    if (found.length) {
      throw new Error(`${label} payload contains forbidden DB/internal keys: ${found.join(', ')}`);
    }
  }

  function cleanAdminPayorBody(body = {}) {
    assertNoAdminDbColumns(body, 'Admin Payor');
    return compactObject({
      organizationId: body.organizationId,
      payorCode: body.payorCode,
      payorName: body.payorName,
      displayName: body.displayName,
      billingEmail: body.billingEmail,
      phone: body.phone,
      isActive: body.isActive,
      notes: body.notes
    });
  }

  function cleanAdminAirlineBody(body = {}) {
    assertNoAdminDbColumns(body, 'Admin Airline');
    return compactObject({
      organizationId: body.organizationId,
      airlineCode: body.airlineCode,
      airlineName: body.airlineName,
      displayName: body.displayName,
      airlineType: body.airlineType,
      iataCode: body.iataCode,
      icaoCode: body.icaoCode,
      mawbPrefix: body.mawbPrefix,
      defaultPickupLocationId: body.defaultPickupLocationId,
      phone: body.phone,
      isActive: body.isActive,
      notes: body.notes
    });
  }

  function cleanAdminEmployeeBody(body = {}) {
    return compactObject({
      organizationId: body.organizationId,
      userId: body.userId,
      employeeNumber: body.employeeNumber,
      displayName: body.displayName,
      email: body.email,
      phone: body.phone,
      employeeType: body.employeeType,
      isDriver: body.isDriver,
      isWarehouse: body.isWarehouse,
      isActive: body.isActive,
      notes: body.notes
    });
  }


  async function request(path, options = {}) {
    const token = getAccessToken();
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || response.statusText;
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (payload && payload.success === false) {
      const message = payload?.error?.message || 'API request failed';
      const error = new Error(message);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  const api = {
    API_BASE_URL,
    getAccessToken,
    setAccessToken,
    clearAccessToken,
    request,
    buildQuery,

    health() {
      return request('/health');
    },

    dbHealth() {
      return request('/health/db');
    },

    version() {
      return request('/api/v1/version');
    },

    me() {
      return request('/api/v1/auth/me');
    },

    manifestStats() {
      return request('/api/v1/manifest/stats');
    },

    manifestUploads(params = {}) {
      return request(`/api/v1/manifest/uploads${buildQuery(params)}`);
    },

    createManifestUpload(body) {
      return request('/api/v1/manifest/uploads', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    createExtractionSession(body) {
      return request('/api/v1/manifest/extraction-sessions', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    completeExtractionSession(sessionId, body) {
      return request(`/api/v1/manifest/extraction-sessions/${encodeURIComponent(sessionId)}/complete`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    manifestReviewQueue(params = {}) {
      return request(`/api/v1/manifest/review-queue${buildQuery(params)}`);
    },

    manifestReviewQueueItem(reviewQueueId) {
      return request(`/api/v1/manifest/review-queue/${encodeURIComponent(reviewQueueId)}`);
    },

    updateExtractedMawb(id, body) {
      return request(`/api/v1/manifest/extracted-mawbs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    },

    updateExtractedHawb(id, body) {
      return request(`/api/v1/manifest/extracted-hawbs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    },

    approveReviewQueue(reviewQueueId, body = {}) {
      return request(`/api/v1/manifest/review-queue/${encodeURIComponent(reviewQueueId)}/approve`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    rejectReviewQueue(reviewQueueId, body = {}) {
      return request(`/api/v1/manifest/review-queue/${encodeURIComponent(reviewQueueId)}/reject`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    pttStats() {
      return request('/api/v1/ptt/stats');
    },

    pttDocuments(params = {}) {
      return request(`/api/v1/ptt/documents${buildQuery(params)}`);
    },

    pttDocument(documentId) {
      return request(`/api/v1/ptt/documents/${encodeURIComponent(documentId)}`);
    },

    pttRecoveryJobStatus(jobId) {
      return request(`/api/v1/ptt/recovery-jobs/${encodeURIComponent(jobId)}/status`);
    },

    pttRecoveryJobAllowsDispatch(jobId) {
      return request(`/api/v1/ptt/recovery-jobs/${encodeURIComponent(jobId)}/allows-dispatch`);
    },

    requireRecoveryPtt(jobId, body = {}) {
      return request(`/api/v1/ptt/recovery-jobs/${encodeURIComponent(jobId)}/require`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    markRecoveryPttNotRequired(jobId, body = {}) {
      return request(`/api/v1/ptt/recovery-jobs/${encodeURIComponent(jobId)}/not-required`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    generateRecoveryPtt(jobId, body = {}) {
      return request(`/api/v1/ptt/recovery-jobs/${encodeURIComponent(jobId)}/generate`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    uploadRecoveryPtt(jobId, body = {}) {
      return request(`/api/v1/ptt/recovery-jobs/${encodeURIComponent(jobId)}/upload`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    approvePttDocument(documentId, body = {}) {
      return request(`/api/v1/ptt/documents/${encodeURIComponent(documentId)}/approve`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    sendPttDocumentToDriver(documentId, body = {}) {
      return request(`/api/v1/ptt/documents/${encodeURIComponent(documentId)}/send-to-driver`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    usePttForRecovery(documentId, body = {}) {
      return request(`/api/v1/ptt/documents/${encodeURIComponent(documentId)}/use-for-recovery`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    voidPttDocument(documentId, body = {}) {
      return request(`/api/v1/ptt/documents/${encodeURIComponent(documentId)}/void`, {
        method: 'POST',
        body: JSON.stringify(compactObject(body))
      });
    },

    driverPttForRecoveryJob(jobId) {
      return request(`/api/v1/ptt/driver/recovery-jobs/${encodeURIComponent(jobId)}/ptt`);
    },

    cargoStatusTypes(params = {}) {
      return request(`/api/v1/cargo/status-types${buildQuery(params)}`);
    },

    cargoMawbs(params = {}) {
      return request(`/api/v1/cargo/mawbs${buildQuery(params)}`);
    },

    cargoMawb(id) {
      return request(`/api/v1/cargo/mawbs/${encodeURIComponent(id)}`);
    },

    adminStats() {
      return request('/api/v1/admin/stats');
    },

    adminOrganizations(params = {}) {
      return request(`/api/v1/admin/organizations${buildQuery(params)}`);
    },

    adminPayors(params = {}) {
      return request(`/api/v1/admin/payors${buildQuery(params)}`);
    },

    adminPayor(payorId) {
      return request(`/api/v1/admin/payors/${encodeURIComponent(payorId)}`);
    },

    createAdminPayor(body) {
      const cleanBody = cleanAdminPayorBody(body);
      return request('/api/v1/admin/payors', {
        method: 'POST',
        body: JSON.stringify(cleanBody)
      });
    },

    updateAdminPayor(payorId, body) {
      const cleanBody = cleanAdminPayorBody(body);
      return request(`/api/v1/admin/payors/${encodeURIComponent(payorId)}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanBody)
      });
    },

    adminAirlines(params = {}) {
      return request(`/api/v1/admin/airlines${buildQuery(params)}`);
    },

    adminAirline(airlineId) {
      return request(`/api/v1/admin/airlines/${encodeURIComponent(airlineId)}`);
    },

    createAdminAirline(body) {
      const cleanBody = cleanAdminAirlineBody(body);
      return request('/api/v1/admin/airlines', {
        method: 'POST',
        body: JSON.stringify(cleanBody)
      });
    },

    updateAdminAirline(airlineId, body) {
      const cleanBody = cleanAdminAirlineBody(body);
      return request(`/api/v1/admin/airlines/${encodeURIComponent(airlineId)}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanBody)
      });
    },

    adminEmployees(params = {}) {
      return request(`/api/v1/admin/employees${buildQuery(params)}`);
    },

    adminEmployee(employeeId) {
      return request(`/api/v1/admin/employees/${encodeURIComponent(employeeId)}`);
    },

    createAdminEmployee(body) {
      const cleanBody = cleanAdminEmployeeBody(body);
      return request('/api/v1/admin/employees', {
        method: 'POST',
        body: JSON.stringify(cleanBody)
      });
    },

    updateAdminEmployee(employeeId, body) {
      const cleanBody = cleanAdminEmployeeBody(body);
      return request(`/api/v1/admin/employees/${encodeURIComponent(employeeId)}`, {
        method: 'PATCH',
        body: JSON.stringify(cleanBody)
      });
    },

    adminUsers(params = {}) {
      return request(`/api/v1/admin/users${buildQuery(params)}`);
    },

    adminUser(userId) {
      return request(`/api/v1/admin/users/${encodeURIComponent(userId)}`);
    },

    updateAdminUserActive(userId, body) {
      return request(`/api/v1/admin/users/${encodeURIComponent(userId)}/active`, {
        method: 'PATCH',
        body: JSON.stringify(compactObject({ isActive: body.isActive, notes: body.notes }))
      });
    },

    adminRoles() {
      return request('/api/v1/admin/roles');
    },

    adminPermissions() {
      return request('/api/v1/admin/permissions');
    },

    adminRolePermissions(roleId) {
      return request(`/api/v1/admin/roles/${encodeURIComponent(roleId)}/permissions`);
    },

    adminUserRoles(userId) {
      return request(`/api/v1/admin/users/${encodeURIComponent(userId)}/roles`);
    },

    assignAdminUserRole(userId, body) {
      return request(`/api/v1/admin/users/${encodeURIComponent(userId)}/roles`, {
        method: 'POST',
        body: JSON.stringify(compactObject({
          organizationId: body.organizationId,
          roleId: body.roleId,
          roleKey: body.roleKey,
          startsAt: body.startsAt,
          endsAt: body.endsAt,
          notes: body.notes
        }))
      });
    },

    updateAdminUserRole(userRoleId, body) {
      return request(`/api/v1/admin/user-roles/${encodeURIComponent(userRoleId)}`, {
        method: 'PATCH',
        body: JSON.stringify(compactObject({
          isActive: body.isActive,
          startsAt: body.startsAt,
          endsAt: body.endsAt,
          notes: body.notes
        }))
      });
    },

    adminAuditLogs(params = {}) {
      return request(`/api/v1/admin/audit-logs${buildQuery(params)}`);
    },

    recoveryStats() {
      return request('/api/v1/recovery/stats');
    },

    recoveryDrivers(params = {}) {
      return request(`/api/v1/recovery/drivers${buildQuery(params)}`);
    },

    recoveryJobs(params = {}) {
      return request(`/api/v1/recovery/jobs${buildQuery(params)}`);
    },

    createRecoveryJob(body) {
      return request('/api/v1/recovery/jobs', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    recoveryJob(jobId) {
      return request(`/api/v1/recovery/jobs/${encodeURIComponent(jobId)}`);
    },

    updateRecoveryJobStatus(jobId, body) {
      return request(`/api/v1/recovery/jobs/${encodeURIComponent(jobId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    },

    assignRecoveryDriver(jobId, body) {
      return request(`/api/v1/recovery/jobs/${encodeURIComponent(jobId)}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    createRecoveryAttempt(jobId, body) {
      return request(`/api/v1/recovery/jobs/${encodeURIComponent(jobId)}/attempts`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    updateRecoveryAttempt(attemptId, body) {
      return request(`/api/v1/recovery/attempts/${encodeURIComponent(attemptId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    },

    createDriverRecoveryEvent(jobId, body) {
      return request(`/api/v1/recovery/jobs/${encodeURIComponent(jobId)}/driver-events`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    }
,

    warehouseStats() {
      return request('/api/v1/warehouse/stats');
    },

    warehouseInspections(params = {}) {
      return request(`/api/v1/warehouse/inspections${buildQuery(params)}`);
    },

    createWarehouseInspection(body) {
      return request('/api/v1/warehouse/inspections', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    readyForReleaseHawbs(params = {}) {
      return request(`/api/v1/warehouse/ready-for-release${buildQuery(params)}`);
    },

    warehouseInspection(inspectionId) {
      return request(`/api/v1/warehouse/inspections/${encodeURIComponent(inspectionId)}`);
    },

    warehouseInspectionHawbs(inspectionId, params = {}) {
      return request(`/api/v1/warehouse/inspections/${encodeURIComponent(inspectionId)}/hawbs${buildQuery(params)}`);
    },

    addWarehouseInspectionNote(inspectionId, body) {
      return request(`/api/v1/warehouse/inspections/${encodeURIComponent(inspectionId)}/notes`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    markHawbInspected(hawbInspectionId, body) {
      return request(`/api/v1/warehouse/hawb-inspections/${encodeURIComponent(hawbInspectionId)}/mark-inspected`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    addHawbInspectionNote(hawbInspectionId, body) {
      return request(`/api/v1/warehouse/hawb-inspections/${encodeURIComponent(hawbInspectionId)}/notes`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    damageStats() {
      return request('/api/v1/damage/stats');
    },

    damageRecords(params = {}) {
      return request(`/api/v1/damage/records${buildQuery(params)}`);
    },

    damageRecord(damageRecordId) {
      return request(`/api/v1/damage/records/${encodeURIComponent(damageRecordId)}`);
    },

    damageRequirements(params = {}) {
      return request(`/api/v1/damage/requirements${buildQuery(params)}`);
    },

    damageRequirement(requirementId) {
      return request(`/api/v1/damage/requirements/${encodeURIComponent(requirementId)}`);
    },

    damagePhotos(params = {}) {
      return request(`/api/v1/damage/photos${buildQuery(params)}`);
    },

    damagePhoto(photoId) {
      return request(`/api/v1/damage/photos/${encodeURIComponent(photoId)}`);
    },

    damageReleaseBlocks(params = {}) {
      return request(`/api/v1/damage/release-blocks${buildQuery(params)}`);
    },

    ensureDamageRecord(hawbInspectionId, body) {
      return request(`/api/v1/damage/hawb-inspections/${encodeURIComponent(hawbInspectionId)}/ensure-record`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    registerDamagePhoto(requirementId, body) {
      return request(`/api/v1/damage/requirements/${encodeURIComponent(requirementId)}/photos`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    waiveDamageRequirement(requirementId, body) {
      return request(`/api/v1/damage/requirements/${encodeURIComponent(requirementId)}/waive`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    rejectDamagePhoto(photoId, body) {
      return request(`/api/v1/damage/photos/${encodeURIComponent(photoId)}/reject`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    },

    voidDamagePhoto(photoId, body) {
      return request(`/api/v1/damage/photos/${encodeURIComponent(photoId)}/void`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    }
,
    releaseStats() {
      return request('/api/v1/release/stats');
    },

    releaseEligibleHawbs(params = {}) {
      return request(`/api/v1/release/eligible-hawbs${buildQuery(params)}`);
    },

    releaseOrders(params = {}) {
      return request(`/api/v1/release/orders${buildQuery(params)}`);
    },

    createReleaseOrder(body) {
      return request('/api/v1/release/orders', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    releaseOrder(releaseOrderId) {
      return request(`/api/v1/release/orders/${encodeURIComponent(releaseOrderId)}`);
    },

    releaseOrderReadiness(releaseOrderId) {
      return request(`/api/v1/release/orders/${encodeURIComponent(releaseOrderId)}/readiness`);
    },

    addReleaseHawb(releaseOrderId, body) {
      return request(`/api/v1/release/orders/${encodeURIComponent(releaseOrderId)}/hawbs`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    recordCustomerApproval(releaseOrderId, body) {
      return request(`/api/v1/release/orders/${encodeURIComponent(releaseOrderId)}/customer-approval`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    createPickupPacket(releaseOrderId, body) {
      return request(`/api/v1/release/orders/${encodeURIComponent(releaseOrderId)}/pickup-packet`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    pickupPackets(params = {}) {
      return request(`/api/v1/release/pickup-packets${buildQuery(params)}`);
    },

    pickupPacket(packetId) {
      return request(`/api/v1/release/pickup-packets/${encodeURIComponent(packetId)}`);
    },

    addPickupPacketDocument(packetId, body) {
      return request(`/api/v1/release/pickup-packets/${encodeURIComponent(packetId)}/documents`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    verifyPickupPacket(packetId, body) {
      return request(`/api/v1/release/pickup-packets/${encodeURIComponent(packetId)}/verify`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    pickupDocuments(params = {}) {
      return request(`/api/v1/release/pickup-documents${buildQuery(params)}`);
    },

    updatePickupDocument(documentId, body) {
      return request(`/api/v1/release/pickup-documents/${encodeURIComponent(documentId)}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });
    }
,
    forkliftStats() {
      return request('/api/v1/forklift/stats');
    },

    forkliftDriverBoard(params = {}) {
      return request(`/api/v1/forklift/driver-board${buildQuery(params)}`);
    },

    forkliftJobs(params = {}) {
      return request(`/api/v1/forklift/jobs${buildQuery(params)}`);
    },

    createForkliftJob(body) {
      return request('/api/v1/forklift/jobs', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    forkliftJob(jobId) {
      return request(`/api/v1/forklift/jobs/${encodeURIComponent(jobId)}`);
    },

    forkliftJobHawbs(jobId, params = {}) {
      return request(`/api/v1/forklift/jobs/${encodeURIComponent(jobId)}/hawbs${buildQuery(params)}`);
    },

    confirmForkliftCargo(jobId, body) {
      return request(`/api/v1/forklift/jobs/${encodeURIComponent(jobId)}/confirm-cargo`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    recordForkliftPalletExchange(jobId, body) {
      return request(`/api/v1/forklift/jobs/${encodeURIComponent(jobId)}/pallet-exchange`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    captureForkliftSignature(jobId, body) {
      return request(`/api/v1/forklift/jobs/${encodeURIComponent(jobId)}/signature`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    finalizeForkliftJob(jobId, body = {}) {
      return request(`/api/v1/forklift/jobs/${encodeURIComponent(jobId)}/finalize`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    forkliftConfirmations(params = {}) {
      return request(`/api/v1/forklift/confirmations${buildQuery(params)}`);
    },

    forkliftPalletExchanges(params = {}) {
      return request(`/api/v1/forklift/pallet-exchanges${buildQuery(params)}`);
    }
,
    equipmentStats() {
      return request('/api/v1/equipment/stats');
    },

    equipmentTypes() {
      return request('/api/v1/equipment/types');
    },

    equipmentRecords(params = {}) {
      return request(`/api/v1/equipment/records${buildQuery(params)}`);
    },

    searchEquipment(equipmentNumber) {
      return request(`/api/v1/equipment/search${buildQuery({ equipmentNumber })}`);
    },

    equipmentRecord(equipmentRecordId) {
      return request(`/api/v1/equipment/records/${encodeURIComponent(equipmentRecordId)}`);
    },

    addMawbEquipment(mawbId, body) {
      return request(`/api/v1/equipment/mawbs/${encodeURIComponent(mawbId)}/records`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    equipmentReturnJobs(params = {}) {
      return request(`/api/v1/equipment/return-jobs${buildQuery(params)}`);
    },

    createEquipmentReturnJob(body) {
      return request('/api/v1/equipment/return-jobs', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    equipmentReturnJob(jobId) {
      return request(`/api/v1/equipment/return-jobs/${encodeURIComponent(jobId)}`);
    },

    assignEquipmentReturnDriver(jobId, body) {
      return request(`/api/v1/equipment/return-jobs/${encodeURIComponent(jobId)}/assign-driver`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    equipmentReturnJobItems(jobId) {
      return request(`/api/v1/equipment/return-jobs/${encodeURIComponent(jobId)}/items`);
    },

    equipmentReturnItems(params = {}) {
      return request(`/api/v1/equipment/return-items${buildQuery(params)}`);
    },

    confirmEquipmentReturn(itemId, body) {
      return request(`/api/v1/equipment/return-items/${encodeURIComponent(itemId)}/confirm`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    equipmentConfirmations(params = {}) {
      return request(`/api/v1/equipment/confirmations${buildQuery(params)}`);
    },

    equipmentHistory(params = {}) {
      return request(`/api/v1/equipment/history${buildQuery(params)}`);
    }
,
    accountingStats() {
      return request('/api/v1/accounting/stats');
    },

    accountingBillingReadyMawbs(params = {}) {
      return request(`/api/v1/accounting/billing-ready/mawbs${buildQuery(params)}`);
    },

    accountingReleaseOrders(params = {}) {
      return request(`/api/v1/accounting/release-orders${buildQuery(params)}`);
    },

    accountingBillingReadyEquipmentReturns(params = {}) {
      return request(`/api/v1/accounting/billing-ready/equipment-returns${buildQuery(params)}`);
    },

    accountingBillablePalletExchanges(params = {}) {
      return request(`/api/v1/accounting/billing-ready/pallet-exchanges${buildQuery(params)}`);
    },

    createInvoicePreview(body) {
      return request('/api/v1/accounting/invoice-preview', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    markEquipmentRecordBilled(equipmentRecordId, body) {
      return request(`/api/v1/accounting/equipment-records/${encodeURIComponent(equipmentRecordId)}/mark-billed`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    }
,
    customerPortalStats() {
      return request('/api/v1/customer-portal/stats');
    },

    customerPortalAccounts(params = {}) {
      return request(`/api/v1/customer-portal/accounts${buildQuery(params)}`);
    },

    createCustomerPortalAccount(body) {
      return request('/api/v1/customer-portal/accounts', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    customerPortalAccount(accountId) {
      return request(`/api/v1/customer-portal/accounts/${encodeURIComponent(accountId)}`);
    },

    customerPortalUsers(accountId) {
      return request(`/api/v1/customer-portal/accounts/${encodeURIComponent(accountId)}/users`);
    },

    linkCustomerPortalUser(accountId, body) {
      return request(`/api/v1/customer-portal/accounts/${encodeURIComponent(accountId)}/users`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    assignCustomerPortalMawb(accountId, body) {
      return request(`/api/v1/customer-portal/accounts/${encodeURIComponent(accountId)}/assign-mawb`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    assignCustomerPortalHawb(accountId, body) {
      return request(`/api/v1/customer-portal/accounts/${encodeURIComponent(accountId)}/assign-hawb`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    assignCustomerPortalFile(accountId, body) {
      return request(`/api/v1/customer-portal/accounts/${encodeURIComponent(accountId)}/assign-file`, {
        method: 'POST',
        body: JSON.stringify(body)
      });
    },

    customerPortalAuditEvents(params = {}) {
      return request(`/api/v1/customer-portal/audit-events${buildQuery(params)}`);
    },

    myPortalAccounts(params = {}) {
      return request(`/api/v1/customer-portal/me/accounts${buildQuery(params)}`);
    },

    myPortalMawbs(params = {}) {
      return request(`/api/v1/customer-portal/me/mawbs${buildQuery(params)}`);
    },

    myPortalMawb(mawbId) {
      return request(`/api/v1/customer-portal/me/mawbs/${encodeURIComponent(mawbId)}`);
    },

    myPortalHawbs(params = {}) {
      return request(`/api/v1/customer-portal/me/hawbs${buildQuery(params)}`);
    },

    myPortalHawb(hawbId) {
      return request(`/api/v1/customer-portal/me/hawbs/${encodeURIComponent(hawbId)}`);
    },

    myPortalReleaseOrders(params = {}) {
      return request(`/api/v1/customer-portal/me/release-orders${buildQuery(params)}`);
    },

    myPortalDamageRecords(params = {}) {
      return request(`/api/v1/customer-portal/me/damage-records${buildQuery(params)}`);
    },

    myPortalFiles(params = {}) {
      return request(`/api/v1/customer-portal/me/files${buildQuery(params)}`);
    },

    logCustomerPortalAccess(body) {
      return request('/api/v1/customer-portal/me/access-events', {
        method: 'POST',
        body: JSON.stringify(body)
      });
    }


  };

  window.OTTApi = api;
})();
