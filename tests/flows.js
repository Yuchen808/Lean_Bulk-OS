// 回归测试：在 headless Chrome 里跑 index.html 的真实交互流程。
// 用法：python tests/run.py（把这段注入页面，结果写进 #test-result）
(function () {
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
    fire($$('.exsel[data-slot=d2d]'), 'd2d_uc');
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
    go('today', '2026-11-08');
    $$('[data-a=water][data-v="500"]').click(); $$('[data-a=water][data-v="750"]').click();
    ok('喝水累计 1.25L', day('2026-11-08').water === 1250, day('2026-11-08').water);
    $$('[data-a=water][data-v="1000"]').click();
    ok('+1 瓶 = 1L', day('2026-11-08').water === 2250, day('2026-11-08').water);
    $$('[data-a=tick][data-v=creatine]').click();
    ok('肌酸打卡', day('2026-11-08').creatine === true, null);
    const vd0 = totals(day('2026-11-08')).t.vd; $$('[data-a=tick][data-v=vitd]').click();
    ok('维生素 D 补剂算进微量营养', Math.abs(totals(day('2026-11-08')).t.vd - vd0 - 10) < 1e-6, [vd0, totals(day('2026-11-08')).t.vd]);
    const ob = oilyWeek('2026-11-08'); const ix = [...EXTRAS, ...S.custom].findIndex(e => e.n === '三文鱼 bagel');
    $$('[data-a=addx][data-i="' + ix + '"]').click();
    ok('三文鱼 bagel 算一份油性鱼', oilyWeek('2026-11-08') === ob + 1, [ob, oilyWeek('2026-11-08')]);
    $$('[data-a=edit][data-k=lunch]').click(); $$('[data-a=iadd][data-v=swp]').click();
    ok('午餐能加红薯', getItems(day('2026-11-08'), 'lunch').some(x => x[0] === 'swp'), getItems(day('2026-11-08'), 'lunch'));
    $$('#sheet').innerHTML = '';

    // 9. 早餐组合
    $$('[data-a=edit][data-k=bfast]').click();
    $$('[data-a=ip][data-i="1"]').click();
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

    // 12. 练前可以按天改：默认香蕉 + 全麦吐司，点开换成 sourdough 组合，再加自定义
    go('today', '2026-11-12');
    const P = day('2026-11-12'); P.train = true; delete P.pre; delete P.done.pre; render();
    const preOf = () => slots(P).find(x => x[0] === 'pre')[1];
    ok('练前默认香蕉 + 全麦吐司', /香蕉/.test(preOf().d) && /全麦吐司/.test(preOf().d) && Math.abs(preOf().k - 202) < 3, preOf());
    const lb = JSON.stringify(S.lastBf || null), k0 = totals(P).t.k;
    $$('[data-a=edit][data-k=pre]').click();
    ok('练前能点开编辑', !!$$('#sheet .sheet') && /练前/.test($$('#sheet').textContent));
    $$('[data-a=ip][data-i="1"]').click();
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
  } catch (e) { out.push('FAIL 异常 ' + e.message); }
  document.body.insertAdjacentHTML('afterbegin', '<pre id="test-result">' + out.join('\n') + '</pre>');
})();
