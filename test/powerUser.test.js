import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  writeDayFile,
  readDayFile,
  getFilePath,
  getTodayDateString,
  getYesterdayDateString,
} from '../src/lib/storage.js';
import config from '../src/lib/config.js';

describe('Power-User Features Unit Tests', () => {

  const yesterdayStr = getYesterdayDateString();
  const todayStr = getTodayDateString();

  beforeEach(() => {
    // Yesterday file with 1 done item and 1 undone item
    const yesterdaySections = {
      Todos: [
        { done: true, text: 'Completed task yesterday', tags: ['dev'], priority: '1', dueDate: null },
        { done: false, text: 'Unfinished task yesterday', tags: ['project/corenote'], priority: '2', dueDate: null },
      ],
    };
    writeDayFile(yesterdayStr, yesterdaySections, 'initial_yesterday');

    // Today file with 1 item
    const todaySections = {
      Todos: [
        { done: false, text: 'Today task', tags: ['work'], priority: '1', dueDate: null },
      ],
    };
    writeDayFile(todayStr, todaySections, 'initial_today');
  });

  afterEach(() => {
    const fileY = getFilePath(yesterdayStr);
    const fileT = getFilePath(todayStr);
    if (fs.existsSync(fileY)) fs.unlinkSync(fileY);
    if (fs.existsSync(fileT)) fs.unlinkSync(fileT);
  });

  test('Carry feature moves undone items from yesterday into today without duplicates', () => {
    const yesterdaySec = readDayFile(yesterdayStr);
    const todaySec = readDayFile(todayStr);

    const undoneItems = yesterdaySec.Todos.filter((item) => !item.done);
    assert.equal(undoneItems.length, 1);
    assert.equal(undoneItems[0].text, 'Unfinished task yesterday');

    todaySec.Todos.push(undoneItems[0]);
    writeDayFile(todayStr, todaySec, 'carry');

    const updatedToday = readDayFile(todayStr);
    assert.equal(updatedToday.Todos.length, 2);
    assert.equal(updatedToday.Todos[1].text, 'Unfinished task yesterday');
  });

  test('Whoami reads config username and lastSyncTime', () => {
    config.set('githubUsername', 'testuser');
    config.set('lastSyncTime', '2026-08-06T12:00:00.000Z');

    assert.equal(config.get('githubUsername'), 'testuser');
    assert.equal(config.get('lastSyncTime'), '2026-08-06T12:00:00.000Z');
  });

});
