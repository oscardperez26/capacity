'use strict'

const { query, transaction } = require('../../config/database')
const { logEvent }           = require('../audit/audit.service')
const { AUDIT_TYPES }        = require('../../shared/constants')

async function getByArea(areaId) {
  const projects = await query(
    `SELECT p.*,
            a.label AS area_label,
            (
              SELECT STRING_AGG(CAST(pm.user_id AS NVARCHAR(MAX)), ',')
              FROM project_members pm
              WHERE pm.project_id = p.id
            ) AS member_ids
     FROM projects p
     JOIN areas a ON p.area_id = a.id
     WHERE p.area_id = ? AND p.status != 'cerrado'
     ORDER BY p.created_at DESC`,
    [areaId]
  )
  return projects.map(p => ({
    ...p,
    assignedTo: p.member_ids ? p.member_ids.split(',').map(Number) : [],
  }))
}

async function getAll() {
  const projects = await query(
    `SELECT p.*, a.label AS area_label,
            (
              SELECT STRING_AGG(CAST(pm.user_id AS NVARCHAR(MAX)), ',')
              FROM project_members pm
              WHERE pm.project_id = p.id
            ) AS member_ids
     FROM projects p
     JOIN areas a ON p.area_id = a.id
     WHERE p.status != 'cerrado'
     ORDER BY p.area_id, p.created_at DESC`
  )
  return projects.map(p => ({
    ...p,
    assignedTo: p.member_ids ? p.member_ids.split(',').map(Number) : [],
  }))
}

async function create({ name, type, areaId }, userId, userName) {
  const [area] = await query('SELECT id, label FROM areas WHERE id = ?', [areaId])
  if (!area) throw Object.assign(new Error('Área no encontrada'), { status: 404 })

  const result = await query(
    `INSERT INTO projects (area_id, name, type, status, created_by)
     VALUES (?, ?, ?, 'activo', ?)`,
    [areaId, name, type, userId]
  )
  const [project] = await query('SELECT * FROM projects WHERE id = ?', [result.insertId])

  await logEvent({
    userId, userName,
    action:     `Proyecto creado — ${name}`,
    entityType: 'project',
    entityId:   project.id,
    type:       AUDIT_TYPES.PROJECT,
  })

  return { ...project, assignedTo: [] }
}

async function assignMembers(projectId, userIds, userId, userName) {
  const [project] = await query('SELECT id, name FROM projects WHERE id = ?', [projectId])
  if (!project) throw Object.assign(new Error('Proyecto no encontrado'), { status: 404 })

  await transaction(async ({ query: txQ }) => {
    await txQ('DELETE FROM project_members WHERE project_id = ?', [projectId])
    for (const uid of userIds) {
      await txQ(
        `MERGE INTO project_members WITH (HOLDLOCK) AS target
         USING (SELECT ? AS project_id, ? AS user_id) AS src
           ON target.project_id = src.project_id AND target.user_id = src.user_id
         WHEN NOT MATCHED THEN
           INSERT (project_id, user_id) VALUES (src.project_id, src.user_id);`,
        [projectId, uid]
      )
    }
  })

  await logEvent({
    userId, userName,
    action:     `Asignación actualizada — ${project.name} (${userIds.length} miembros)`,
    entityType: 'project',
    entityId:   projectId,
    type:       AUDIT_TYPES.PROJECT,
  })

  const [updated] = await query(
    `SELECT p.*,
            (
              SELECT STRING_AGG(CAST(pm.user_id AS NVARCHAR(MAX)), ',')
              FROM project_members pm
              WHERE pm.project_id = p.id
            ) AS member_ids
     FROM projects p
     WHERE p.id = ?`,
    [projectId]
  )
  return {
    ...updated,
    assignedTo: updated.member_ids ? updated.member_ids.split(',').map(Number) : [],
  }
}

module.exports = { getByArea, getAll, create, assignMembers }
