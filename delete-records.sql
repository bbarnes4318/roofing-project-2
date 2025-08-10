-- Delete Users by Email
DELETE FROM users WHERE email IN (
    'maria.garcia@kenstruction.com',
    'robert.smith@kenstruction.com',
    'emily.davis@kenstruction.com',
    'james.wilson@kenstruction.com',
    'mike.rodriguez@kenstruction.com',
    'patricia.brown@kenstruction.com',
    'lisa.johnson@kenstruction.com',
    'jennifer.williams@kenstruction.com',
    'charles.jones@kenstruction.com'
);

-- Delete Projects by ID
DELETE FROM projects WHERE id IN (
    'cme1imthh0002umt03zk98eh7',
    'cme1injl70004umt0x19eota6',
    'cme1zf55x0003umecgyn0xd5o',
    'cme203m6d0003umbo5ybhkdjw',
    'cme20bl4b0003um70ouajhq6s',
    'cme2267ib0003umjom6h1beh5',
    'cme2hm8h40002umykfa9817qs',
    'cme2jhbvf0003a90da4ap1t43'
);

-- Delete Customers by ID
DELETE FROM customers WHERE id IN (
    'cme1im8sf0000umt0e1825rk3',
    'cme1zf4v70001umecoj38f6pp',
    'cme203lvu0001umbo10h7f40n',
    'cme20bktp0001um70ljqsd4gx',
    'cme22677c0001umjom5tsl66u',
    'cme2hem9r0000um8wst9mkfwr',
    'cme2hf5rd0000umco499xq501',
    'cme2hjk8s0000umds5u9pbnd3',
    'cme2hk8on0001umdssvmvhiuz',
    'cme2hkx1t0000umoortqa1nb6',
    'cme2hlyl70000umykmxq0icdy',
    'cme2jhbrk0000a90douou5avd'
);