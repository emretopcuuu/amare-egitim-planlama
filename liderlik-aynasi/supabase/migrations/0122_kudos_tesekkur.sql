-- [Şahitlik geliştirme #10] Alkışa tepki görünürlüğü — kişi bir şahit alkışını
-- karşılıksız görmesin; "Teşekkür et" bir kez basılabilsin (tekrar push spam'i
-- olmasın diye bayrak).
alter table kudos add column if not exists tesekkur_edildi boolean not null default false;
