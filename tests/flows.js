// 回归测试：在 headless Chrome 里跑 index.html 的真实交互流程。
// 用法：python tests/run.py（把这段注入页面，结果写进 #test-result）
(async function () {
  const out = [];
  const ok = (name, cond, info) => out.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ← ' + JSON.stringify(info)));
  const $$ = s => document.querySelector(s);
  const fire = (el, v) => { el.value = v; el.dispatchEvent(new Event('change', { bubbles: true })); };
  const sess = d => S.sessions.find(x => x.date === d);
  const go = (tab, view) => { VIEW = view; DRAFT = null; TD = null; document.querySelector(`nav [data-tab=${tab}]`).click(); };
  try {
    // 1. 11/7 预置记录
    const s7 = sess('2026-11-07');
    ok('11/7 有 5 个动作', s7 && Object.keys(s7.sets).length === 5, s7 && Object.keys(s7.sets));

    // 2. 已保存那天换动作，记录跟着走
    go('train', '2026-11-07');
    fire($$('.exsel[data-slot=d2h]'), 'd2d_uc');
    ok('换成单臂绳索弯举后记录跟着改', sess('2026-11-07').sets.d2d_uc && !sess('2026-11-07').sets.d2d_db, Object.keys(sess('2026-11-07').sets));

    // 3. 只改右边次数，保存后不跳回
    fire($$('.trin[data-id=d2d_uc][data-f=rR]'), '5.5');
    $$('[data-a=savesess]').click();
    ok('右边次数保存进数据', sess('2026-11-07').sets.d2d_uc.rR === 5.5, sess('2026-11-07').sets.d2d_uc);
    ok('保存后界面显示 5.5', $$('.trin[data-id=d2d_uc][data-f=rR]').value === '5.5', $$('.trin[data-id=d2d_uc][data-f=rR]').value);
    ok('保存后是绿色已保存', !!$$('.savedbox'), null);

    // 4. 只改左边重量
    go('train', '2026-11-07');
    fire($$('.trin[data-id=d2a][data-f=w]'), '42.5');
    $$('[data-a=savesess]').click();
    ok('左边重量保存', sess('2026-11-07').sets.d2a.w === 42.5, sess('2026-11-07').sets.d2a);

    // 5. 取消勾选再保存 = 删掉
    go('train', '2026-11-07');
    $$('[data-a=exok][data-id=d2e_lp]').click();
    $$('[data-a=savesess]').click();
    ok('取消勾选的动作被删掉', !sess('2026-11-07').sets.d2e_lp, Object.keys(sess('2026-11-07').sets));

    // 6. 重新导入 Strong 不覆盖改过的记录
    importStrong(SEED_1107);
    ok('重新导入不覆盖手改', sess('2026-11-07').sets.d2a.w === 42.5 && !sess('2026-11-07').sets.d2e_lp, sess('2026-11-07').sets);

    // 7. 新的一天：建议来自之前的记录，按钮是保存
    go('train', '2026-11-08');
    if (!day('2026-11-08').train) $$('[data-a=trset][data-v="1"]').click();
    $$('[data-a=td][data-v=D2]').click();
    ok('新一天显示加重建议', $$('.trin[data-id=d2a][data-f=w]').value === '42.5', $$('.trin[data-id=d2a][data-f=w]').value);
    ok('新一天按钮是保存', !$$('.savedbox') && !!$$('[data-a=savesess]'), null);
    fire($$('.trin[data-id=d2c][data-f=w]'), '45');
    $$('[data-a=savesess]').click();
    ok('新一天保存成功', sess('2026-11-08') && sess('2026-11-08').sets.d2c.w === 45, sess('2026-11-08'));
    go('train', '2026-11-08');
    ok('新一天保存后绿色', !!$$('.savedbox'), null);

    // 7a. 2026-11-23 新课表：默认动作是新版的，不被旧记录带回去
    OVR = {}; S.settings.alt = {}; // 清掉第 2 步手选的动作
    const idsOf = d => { go('train', '2026-11-24'); if (!day('2026-11-24').train) $$('[data-a=trset][data-v="1"]').click(); $$('[data-a=td][data-v=' + d + ']').click(); return [...document.querySelectorAll('[data-a=exok]')].map(b => b.dataset.id).join(); };
    for (const d of ['D1', 'D2', 'D3', 'D4']) { const g = idsOf(d), w = PLAN[d].ex.map(e => e[0]).join(); ok(d + ' 默认显示新课表', g === w, [g, w]); }
    ok('11/22 器械推胸归到 d1f', sess('2026-11-22').sets.d1f && sess('2026-11-22').sets.d1f.w === 43, Object.keys(sess('2026-11-22').sets));
    ok('11/24 轮到 D2', nextDay('2026-11-24') === 'D2', nextDay('2026-11-24'));
    ok('没有重复 id', new Set(ALL_EX.map(e => e[0])).size === ALL_EX.length);
    idsOf('D2'); ok('显示组数和超级组', /A1 · 2 组 · 8–12 次/.test(document.body.textContent));

    // 7b. 日历：练过的日子有绿点和淡绿底
    $$('.date.tap').click();
    const c7=$$('.cal [data-v="2026-11-07"]');
    ok('日历 11/7 有绿点和绿底', c7&&c7.querySelector('.dot')&&c7.classList.contains('tr'), c7&&c7.className);
    $$('#sheet').innerHTML='';

    // 8. 体重两位小数 + 绿色
    go('today', '2026-11-08');
    $$('#w').value = '68.55'; $$('[data-a=w]').click();
    ok('体重存两位小数', day('2026-11-08').w === 68.55, day('2026-11-08').w);
    ok('体重框变绿', $$('#w').classList.contains('saved'), null);

    // 8b. 碳水 / 脂肪显示目标
    const subs=[...document.querySelectorAll('.stats .sub')].map(x=>x.textContent);
    ok('目标 2500 / 碳水 ~314 / 脂肪 65', S.settings.kcal===2500&&subs.some(x=>/\/ 31\d g/.test(x))&&subs.some(x=>/\/ 65 g/.test(x)), subs);

    // 8c. 喝水 / 肌酸 / 维生素 D / 加餐 / 红薯
    go('today', '2026-11-05');
    $$('[data-a=water][data-v="500"]').click(); $$('[data-a=water][data-v="750"]').click();
    ok('喝水累计 1.25L', day('2026-11-05').water === 1250, day('2026-11-05').water);
    $$('[data-a=water][data-v="1000"]').click();
    ok('+1 瓶 = 1L', day('2026-11-05').water === 2250, day('2026-11-05').water);
    $$('[data-a=tick][data-v=creatine]').click();
    ok('肌酸打卡', day('2026-11-05').creatine === true, null);
    const vd0 = totals(day('2026-11-05')).t.vd; $$('[data-a=tick][data-v=vitd]').click();
    ok('维生素 D 补剂算进微量营养', Math.abs(totals(day('2026-11-05')).t.vd - vd0 - 10) < 1e-6, [vd0, totals(day('2026-11-05')).t.vd]);
    go('today', '2026-11-08');
    const ob = oilyWeek('2026-11-08'); const ix = [...EXTRAS, ...S.custom].findIndex(e => e.n === '三文鱼 bagel');
    $$('[data-a=addx][data-i="' + ix + '"]').click();
    ok('三文鱼 bagel 算一份油性鱼', oilyWeek('2026-11-08') === ob + 1, [ob, oilyWeek('2026-11-08')]);
    $$('[data-a=edit][data-k=lunch]').click(); $$('[data-a=iadd][data-v=swp]').click();
    ok('午餐能加红薯', getItems(day('2026-11-08'), 'lunch').some(x => x[0] === 'swp'), getItems(day('2026-11-08'), 'lunch'));
    $$('#sheet').innerHTML = '';

    // 9. 早餐组合
    $$('[data-a=edit][data-k=bfast]').click();
    $$('[data-a=ip][data-i="0"]').click();
    ok('早餐第一个模板是 yw香蕉奶昔', JSON.stringify(day('2026-11-08').bf.map(x => x[0])) === JSON.stringify(['milk', 'pb', 'oat', 'cx', 'ban']) && Math.abs(sumItems(day('2026-11-08').bf).k - 757) < 15, sumItems(day('2026-11-08').bf));
    $$('[data-a=ip][data-i="2"]').click();
    ok('早餐换成 3 全蛋', JSON.stringify(day('2026-11-08').bf) === JSON.stringify([['egg', 3], ['oil', 5]]), day('2026-11-08').bf);
    $$('#sheet').innerHTML = '';

    // 10. 11/8 预置的 sourdough 蜂蜜花生酱加餐
    const sd = day('2026-11-08').extras.find(e => e.n === 'Sourdough 蜂蜜花生酱');
    ok('11/8 已记 sourdough 加餐', sd && Math.round(sd.p) === 14 && Math.round(sd.k) === 396, sd);
    ok('它也存成了常用加餐', S.custom.some(c => c.n === 'Sourdough 蜂蜜花生酱' && c.items), S.custom);

    // 11. 自定义加餐：拼食材 → 记进当天 + 存成常用
    go('today', '2026-11-08');
    const n0 = day('2026-11-08').extras.length, c0 = S.custom.length;
    $$('[data-a=snew]').click();
    const nm = $$('#snn'); nm.value = '测试加餐'; nm.dispatchEvent(new Event('input', { bubbles: true }));
    $$('[data-a=sadd][data-v=skyr]').click();
    fire($$('.sin[data-i="0"]'), '200');
    $$('#sxn').value = '蓝莓'; $$('#sxg').value = '100'; $$('[data-a=sxadd]').click();
    $$('[data-a=slog]').click();
    const tx = day('2026-11-08').extras[n0];
    ok('自定义加餐记进当天', day('2026-11-08').extras.length === n0 + 1 && tx.n === '测试加餐' && Math.abs(tx.p - 22.7) < .2, tx);
    ok('自定义加餐存成常用', S.custom.length === c0 + 1, S.custom);

    // 11b. 认不出的食材：当场填每 100g → 加进去，并记住
    $$('[data-a=snew]').click();
    $$('#sxn').value = 'Sourcream'; $$('#sxg').value = '30'; $$('[data-a=sxadd]').click();
    ok('Sour cream 能认出来', SN.items.length === 1 && SN.items[0][2].n === 'Sourcream', SN.items);
    $$('#sxn').value = '外星果'; $$('#sxg').value = '50'; $$('[data-a=sxadd]').click();
    ok('认不出时弹出每 100g 输入', !!$$('#sqp') && SN.ask && SN.ask.n === '外星果');
    $$('#sqp').value = '10'; $$('#sqc').value = '20'; $$('#sqf').value = '0'; $$('[data-a=sqadd]').click();
    ok('填完就加进去', SN.items.length === 2 && SN.items[1][2].k === 120, SN.items);
    ok('下次认识它', !!estimate('外星果') && estimate('外星果').p === 10);
    $$('[data-a=close]').click(); SN = null;
    const ci = [...EXTRAS, ...S.custom].findIndex(e => e.n === '测试加餐');
    $$('[data-a=addx][data-i="' + ci + '"]').click();
    ok('常用加餐一键再加', day('2026-11-08').extras.length === n0 + 2, day('2026-11-08').extras.length);

    // 11b. 新肉都能生熟切换
    ok('牛羊火鸡猪都有熟重版', ['beef', 'lamb', 'tky', 'pork'].every(id => FOOD[id].raw && FOOD[id + '_ck'] && FOOD[id + '_ck'].rawOf === id && FOOD[id + '_ck'].p > FOOD[id].p), ['beef', 'lamb', 'tky', 'pork'].map(id => FOOD[id + '_ck']));
    // 12. 练前可以按天改：默认香蕉 + 全麦吐司，点开换成 sourdough 组合，再加自定义
    go('today', '2026-11-12');
    const P = day('2026-11-12'); P.train = true; delete P.pre; delete P.done.pre; render();
    const preOf = () => slots(P).find(x => x[0] === 'pre')[1];
    ok('练前默认香蕉 + 全麦吐司', /香蕉/.test(preOf().d) && /全麦吐司/.test(preOf().d) && Math.abs(preOf().k - 161) < 3, preOf());
    const lb = JSON.stringify(S.lastBf || null), k0 = totals(P).t.k;
    $$('[data-a=edit][data-k=pre]').click();
    ok('练前能点开编辑', !!$$('#sheet .sheet') && /练前/.test($$('#sheet').textContent));
    $$('[data-a=ip][data-i="2"]').click();
    ok('练前换成 sourdough 组合', P.pre && P.pre.map(x => x[0]).join() === 'sd,ban,pb', P.pre);
    fire($$('.iin[data-i="2"]'), '25');
    ok('练前花生酱改成 25g', P.pre[2][1] === 25, P.pre);
    $$('[data-a=cform][data-v=est]').click();
    $$('#cxn').value = '蜂蜜'; $$('#cxg').value = '10'; $$('[data-a=cxadd]').click();
    ok('练前能加自定义食材', P.pre.length === 4 && P.pre[3][2].n === '蜂蜜', P.pre);
    $$('#sheet [data-a=close]').click();
    ok('改练前不动早餐的记忆，也不带到别的天', JSON.stringify(S.lastBf || null) === lb && !day('2026-11-13').pre);
    $$('[data-a=eat][data-k=pre]').click();
    ok('练前打勾后按新内容计入当天', Math.abs(totals(P).t.k - k0 - preOf().k) < 1 && preOf().k > 400, [totals(P).t.k, k0, preOf().k]);
    ok('列表显示新的练前', /Sourdough/.test($$('[data-a=edit][data-k=pre]').textContent), $$('[data-a=edit][data-k=pre]').textContent);
    // 自定义食物记成候选，别的天别的餐一点就加
    go('today', '2026-11-21'); $$('[data-a=edit][data-k=dinner]').click();
    $$('[data-a=cform][data-v=full]').click();
    $$('#cxn').value = '韩国面（测试）'; $$('#cxg').value = '110'; $$('#cxp').value = '9'; $$('#cxc').value = '70'; $$('#cxf').value = '2';
    $$('[data-a=cxadd]').click(); $$('#sheet [data-a=close]').click();
    ok('自定义食物进了候选', S.myFoods[0].n === '韩国面（测试）' && S.myFoods[0].g === 110, S.myFoods[0]);
    go('today', '2026-11-22'); $$('[data-a=edit][data-k=lunch]').click();
    const myb = [...document.querySelectorAll('[data-a=myadd]')].find(b => /韩国面/.test(b.textContent));
    ok('别的天午饭能看到候选', !!myb);
    const lbls = [...document.querySelectorAll('#sheet .lbl')].map(x => x.textContent);
    ok('候选按类分组，不再有「加肉 / 鱼」「加别的」', lbls.includes('肉 / 鱼 / 蛋') && lbls.includes('主食 / 碳水') && !lbls.some(t => /加肉|加别的|我加过的/.test(t)), lbls);
    ok('韩国面归在主食 / 碳水', myb && myb.parentElement.previousElementSibling.textContent === '主食 / 碳水');
    myb && myb.click();
    const li = day('2026-11-22').meals.lunch.items, last = li[li.length - 1];
    ok('点候选按上次克数加进来', last[0] === 'cx' && last[2].n === '韩国面（测试）' && last[1] === 110 && last[2].c === 70, last);
    ok('已经在这一顿的不再显示', ![...document.querySelectorAll('[data-a=myadd]')].some(b => /韩国面/.test(b.textContent)));
    $$('#sheet [data-a=close]').click();
    // 熟重：鸡胸切成熟重，克数不变，营养按熟重算
    ok('鸡胸熟重 ≈ 147 kcal/100g', Math.abs(FOOD.cb_ck.k - 146.7) < 1, FOOD.cb_ck);
    go('today', '2026-11-20'); const L = day('2026-11-20'); L.meals.lunch.items = [['cb', 200], ['rice', 220]];
    $$('[data-a=edit][data-k=lunch]').click(); $$('[data-a=rawck][data-i="0"]').click();
    ok('点生重⇄后变成熟重、克数不变', L.meals.lunch.items[0][0] === 'cb_ck' && L.meals.lunch.items[0][1] === 200, L.meals.lunch.items);
    $$('[data-a=rawck][data-i="0"]').click();
    ok('再点切回生重', L.meals.lunch.items[0][0] === 'cb', L.meals.lunch.items);
    ok('11/14 午餐鸡胸是熟重', (S.days['2026-11-14'].meals.lunch.items || []).some(x => x[0] === 'cb_ck'), S.days['2026-11-14'].meals.lunch.items);
  } catch (e) { out.push('FAIL 异常 ' + e.message); }

  // 13. 云端同步（mock fetch，不连网）
  const realFetch = window.fetch, calls = [];
  let remote = null, sha = 'sha0', status = 0;
  window.fetch = async (url, o = {}) => {
    calls.push({ url, method: o.method || 'GET', body: o.body, auth: o.headers && o.headers.Authorization });
    if (status) return new Response('{}', { status });
    if ((o.method || 'GET') === 'GET') {
      if (!remote) return new Response('{"message":"Not Found"}', { status: 404 });
      return new Response(JSON.stringify({ sha, size: 1, content: b64e(JSON.stringify(remote)) }), { status: 200 });
    }
    const b = JSON.parse(o.body); remote = JSON.parse(b64d(b.content)); sha = 'sha' + calls.length;
    return new Response(JSON.stringify({ content: { sha } }), { status: 200 });
  };
  try {
    localStorage.removeItem(TOKEN_KEY); BOOT = false; calls.length = 0;
    save();
    ok('没 token：save 不排同步', !SYNC.timer, SYNC.timer);
    await syncNow();
    ok('没 token：不发请求', calls.length === 0, calls);

    localStorage.setItem(TOKEN_KEY, 'test_tok');
    day('2026-11-21').water = 500; save();
    ok('有 token：save 后排了 5 秒同步，并打 updatedAt', !!SYNC.timer && !!S.updatedAt, [SYNC.timer, S.updatedAt]);
    clearTimeout(SYNC.timer); SYNC.timer = null;
    remote = {}; await syncNow();
    const put = calls.find(c => c.method === 'PUT');
    ok('同步：先 GET 再 PUT，带 sha 和 token', calls[0].method === 'GET' && put && JSON.parse(put.body).sha === 'sha0' && put.auth === 'Bearer test_tok', calls.map(c => c.method));
    ok('云端收到完整数据（中文不乱码）', remote.days['2026-11-21'].water === 500 && remote.updatedAt === S.updatedAt && remote.custom.some(c => c.n === 'Sourdough 蜂蜜花生酱'), remote && remote.updatedAt);
    ok('同步成功显示时间', !!SYNC.st.at && !SYNC.st.err, SYNC.st);

    // 新生设备（被清过）：从云端恢复，保留本机 born，本机多的那天也留下
    const cloud = JSON.parse(JSON.stringify(remote)); cloud.born = 'OTHER'; cloud.updatedAt = '2020-01-01T00:00:00.000Z';
    remote = cloud;
    const born0 = S.born, keepDays = Object.keys(cloud.days).length;
    S = Object.assign(DEF(), { born: born0, bornFresh: true, updatedAt: new Date().toISOString(), days: { '2030-01-05': { w: 70.3 } } });
    localStorage.setItem(KEY, JSON.stringify(S));
    calls.length = 0; await syncNow();
    ok('新生设备从云端恢复', S.days['2026-11-21'] && S.days['2026-11-21'].water === 500 && S.sessions.length > 3 && Object.keys(S.days).length >= keepDays + 1, Object.keys(S.days).length);
    ok('恢复后保留本机 born', S.born === born0 && JSON.parse(localStorage.getItem(KEY)).born === born0, S.born);
    ok('本机多的那天合并后推回云端', S.days['2030-01-05'].w === 70.3 && remote.days['2030-01-05'] && calls.some(c => c.method === 'PUT'), calls.map(c => c.method));
    save(); clearTimeout(SYNC.timer); SYNC.timer = null;
    ok('恢复后 save 不被防覆盖拦住', JSON.parse(localStorage.getItem(KEY)).updatedAt === S.updatedAt && !GUARD_HIT, GUARD_HIT);

    // 云端更新（别的设备）→ 拉下来；本机更新 → 推上去
    remote = JSON.parse(JSON.stringify(S)); remote.updatedAt = '2099-01-01T00:00:00.000Z'; remote.days['2026-11-23'] = { w: 71 };
    calls.length = 0; await syncNow();
    ok('云端更新时拉下来、不推', S.days['2026-11-23'] && !calls.some(c => c.method === 'PUT'), calls.map(c => c.method));
    remote.updatedAt = '2000-01-01T00:00:00.000Z'; remote.days = { '2026-01-01': {} };
    S.updatedAt = '2100-01-01T00:00:00.000Z'; calls.length = 0; await syncNow();
    ok('本机更新时推上去', calls.some(c => c.method === 'PUT') && remote.days['2026-11-23'], calls.map(c => c.method));

    // 失败：401 / 离线 → 显示原因，下次再试
    status = 401; await syncNow();
    ok('401 显示 token 无效', /token 无效/.test(SYNC.st.err), SYNC.st);
    status = 0; window.fetch = async () => { throw new TypeError('Failed to fetch') };
    await syncNow();
    ok('离线显示原因', /连不上|离线/.test(SYNC.st.err), SYNC.st);
    go('set', VIEW);
    ok('设置页有云端同步卡片和失败原因', /云端同步/.test(document.body.textContent) && !!$$('[data-a=ghsync]') && /失败/.test(document.body.textContent));
  } catch (e) { out.push('FAIL 同步异常 ' + e.message); }
  window.fetch = realFetch; localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(SYNC_KEY);
  document.body.insertAdjacentHTML('afterbegin', '<pre id="test-result">' + out.join('\n') + '</pre>');
})();
