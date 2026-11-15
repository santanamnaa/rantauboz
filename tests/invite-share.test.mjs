import test from 'node:test';
import assert from 'node:assert/strict';
import {inviteShareTitle,inviteShareText} from '../lib/invite-share.mjs';
test('invitation message matches the permission actually selected',()=>{assert.match(inviteShareTitle,/Undangan Teman Rantau/);assert.match(inviteShareText('progress'),/tanpa nominal/);assert.match(inviteShareText('summary'),/ringkasan budget dan pengeluaran bulanan/);assert.match(inviteShareText('selected'),/budget yang kupilih/);assert.match(inviteShareText('off'),/budgetku tetap pribadi/);for(const mode of ['progress','summary','selected','off']){const text=inviteShareText(mode);assert.match(text,/pilih sendiri/);assert.match(text,/masuk atau buat akun/);assert(!text.includes('Rp'));assert(!text.includes('password'))}});
